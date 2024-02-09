/*!
 * Copyright 2011-2023 Unlok
 * https://www.unlok.ca
 *
 * Credits & Thanks:
 * https://www.unlok.ca/credits-thanks/
 *
 * Wayward is a copyrighted and licensed work. Modification and/or distribution of any source files is prohibited. If you wish to modify the game in any way, please refer to the modding guide:
 * https://github.com/WaywardGame/types/wiki
 */

import { EventBus } from "@wayward/game/event/EventBuses";
import { EventHandler } from "@wayward/game/event/EventManager";
import { PlayerState } from "@wayward/game/game/entity/player/IPlayer";
import Player from "@wayward/game/game/entity/player/Player";
import PlayerManager from "@wayward/game/game/entity/player/PlayerManager";
import { Game } from "@wayward/game/game/Game";
import { PauseSource } from "@wayward/game/game/IGame";
import DedicatedServerManager from "@wayward/game/game/meta/DedicatedServerManager";
import { GameMode } from "@wayward/game/game/options/IGameOptions";
import Dictionary from "@wayward/game/language/Dictionary";
import TranslationImpl from "@wayward/game/language/impl/TranslationImpl";
import Translation from "@wayward/game/language/Translation";
import Mod from "@wayward/game/mod/Mod";
import Register from "@wayward/game/mod/ModRegistry";
import { CheckButton } from "@wayward/game/ui/component/CheckButton";
import Component from "@wayward/game/ui/component/Component";
import { RangeRow } from "@wayward/game/ui/component/RangeRow";
import { Bound } from "@wayward/utilities/Decorators";
import { sleep } from "@wayward/utilities/promise/Async";

enum GameState {
	OutsideGame,
	WaitingForPlayers,
	Countdown,
	Playing,
	Ending,
}

enum ChallengeServerTranslation {
	Countdown,
	EndingCountdown,
	Start,
	DescriptionCountdown,
	DescriptionWaiting,
	DescriptionPlaying,
	DescriptionEnding,
	Time,
	TimeSimple,
	WinByDefault,
	OptionCountdownTime,
	OptionEndingCountdownTime,
	OptionPlayersToWaitFor,
	OptionLastSurvivingPlayerWins,
}

function translation(id: ChallengeServerTranslation): TranslationImpl {
	return Translation.get(ChallengeServer.INSTANCE.dictionary, id);
}

function translateTime(time: number, type: "default" | "simple" | "analog" = "default"): TranslationImpl {
	time = Math.floor(time / 1000);
	if (type === "analog") {
		const secondsString = `${time % 60}`;
		return translation(ChallengeServerTranslation.TimeSimple).addArgs(Math.floor(time / 60), secondsString.length === 2 ? secondsString : `0${secondsString}`);
	}

	return translation(ChallengeServerTranslation.Time).addArgs(Math.floor(time / 60), time % 60, type === "simple");
}

function minutes(amt: number): number {
	return amt * 60 * 1000;
}

function seconds(amt: number): number {
	return amt * 1000;
}

interface IChallengeServerData {
	playersToWaitFor: number;
	countdownTime: number;
	endingCountdownTime: number;
	lastSurvivingPlayerWinsAutomatically: boolean;
}

export default class ChallengeServer extends Mod {

	@Mod.instance("Challenge Server")
	public static INSTANCE: ChallengeServer;

	@Register.dictionary("dictionary", ChallengeServerTranslation)
	public dictionary: Dictionary;

	@Mod.globalData("Challenge Server")
	public data: IChallengeServerData;

	private gameState = GameState.OutsideGame;

	private contenders: Set<string>;
	private winnerName: string | undefined;
	private elapsed: number;

	public override initializeGlobalData(data?: IChallengeServerData): IChallengeServerData {
		return data || {
			playersToWaitFor: 2,
			countdownTime: 5,
			endingCountdownTime: 2,
			lastSurvivingPlayerWinsAutomatically: true,
		};
	}

	@Register.optionsSection
	public initializeOptionsSection(section: Component): void {
		new RangeRow()
			.setLabel(label => label.setText(translation(ChallengeServerTranslation.OptionCountdownTime)))
			.editRange(range => range
				.setMin(0.5)
				.setMax(10)
				.setStep(0.5)
				.setRefreshMethod(() => this.data.countdownTime))
			.event.subscribe("finish", (_, value) => this.data.countdownTime = value)
			.setDisplayValue(value => translateTime(minutes(value), "analog"))
			.appendTo(section);

		new RangeRow()
			.setLabel(label => label.setText(translation(ChallengeServerTranslation.OptionEndingCountdownTime)))
			.editRange(range => range
				.setMin(0.5)
				.setMax(5)
				.setStep(0.5)
				.setRefreshMethod(() => this.data.endingCountdownTime))
			.event.subscribe("finish", (_, value) => this.data.endingCountdownTime = value)
			.setDisplayValue(value => translateTime(minutes(value), "analog"))
			.appendTo(section);

		new RangeRow()
			.setLabel(label => label.setText(translation(ChallengeServerTranslation.OptionPlayersToWaitFor)))
			.editRange(range => range
				.setMin(2)
				.setMax(32)
				.setRefreshMethod(() => this.data.playersToWaitFor))
			.event.subscribe("finish", (_, value) => this.data.playersToWaitFor = value)
			.setDisplayValue(true)
			.appendTo(section);

		new CheckButton()
			.setText(translation(ChallengeServerTranslation.OptionLastSurvivingPlayerWins))
			.setRefreshMethod(() => this.data.lastSurvivingPlayerWinsAutomatically)
			.event.subscribe("toggle", (_, checked) => { this.data.lastSurvivingPlayerWinsAutomatically = checked; })
			.appendTo(section);
	}

	@EventHandler(EventBus.Game, "play")
	public onGameStart(game: Game, isLoadingSave: boolean, playedCount: number): void {
		if (game.getGameMode() !== GameMode.Challenge) return;

		game.setPaused(true, PauseSource.Generic);
		this.contenders = new Set();
		this.winnerName = undefined;
		sleep(seconds(1)).then(this.waitForPlayers);
	}

	@EventHandler(EventBus.PlayerManager, "join")
	public onPlayerJoin(manager: PlayerManager, player: Player): void {
		if (game.getGameMode() !== GameMode.Challenge) return;

		if (this.gameState === GameState.WaitingForPlayers || this.gameState === GameState.Countdown) {
			this.contenders.add(player.identifier);
			if (this.gameState === GameState.WaitingForPlayers && game.playerManager.getAll(true, true).length >= this.data.playersToWaitFor) {
				this.startCountdown();
			}
		}

		if (this.gameState === GameState.Ending && !this.winnerName && player.state === PlayerState.None && this.contenders.has(player.identifier)) {
			// someone that left earlier rejoined, we continue the game for that person
			this.continueGame();
		}
	}

	@EventHandler(EventBus.PlayerManager, "leave")
	public onPlayerLeave(manager: PlayerManager, player: Player): void {
		if (game.getGameMode() !== GameMode.Challenge) return;

		if (this.gameState === GameState.WaitingForPlayers) {
			this.contenders.delete(player.identifier);
		}

		// the players.length calculations in here are 1 off because the player hasn't actually left yet
		const allPlayers = game.playerManager.getAll(true, true);
		if (allPlayers.length - 2 < this.data.playersToWaitFor) {
			if (this.gameState === GameState.Countdown) {
				this.waitForPlayers();
			}

			if (!allPlayers.some(p => p !== player && p.state === PlayerState.None)) {
				// this was the last living player
				this.startEndingCountdown();
			}
		}
	}

	@EventHandler(EventBus.Players, "die")
	public onPlayerDeath(player: Player): void {
		if (game.getGameMode() !== GameMode.Challenge)
			return;

		const remainingPlayers = game.playerManager.getAll(true, true).filter(p => p !== player && p.state === PlayerState.None);
		if (remainingPlayers.length > 1)
			return;

		if (remainingPlayers.length === 1) {
			if (!this.data.lastSurvivingPlayerWinsAutomatically)
				return;

			this.winnerName = remainingPlayers[0].getName().getString();
			multiplayer.sendChatMessage(localPlayer, translation(ChallengeServerTranslation.WinByDefault)
				.addArgs(this.winnerName)
				.getString());
		}

		this.startEndingCountdown();
		return;
	}

	@EventHandler(EventBus.Players, "sailToCivilization")
	public onSailToCivilization(player: Player): void {
		if (game.getGameMode() !== GameMode.Challenge) return;

		this.winnerName = player.getName().getString();
		this.startEndingCountdown();
	}

	public override onUnload(): void {
		this.gameState = GameState.OutsideGame;
	}

	private setDescription(description: Translation): void {
		multiplayer.updateOptions({ description: description.getString() });
		ui.refreshTranslations();
	}

	@Bound
	private waitForPlayers(): void {
		this.gameState = GameState.WaitingForPlayers;
		this.setDescription(translation(ChallengeServerTranslation.DescriptionWaiting));
	}

	private async startCountdown(): Promise<void> {
		this.gameState = GameState.Countdown;

		// const countdownTime = seconds(30);
		const countdownTime = minutes(this.data.countdownTime);

		for (let elapsed = 0; elapsed < countdownTime; elapsed += seconds(1)) {
			await sleep(seconds(1));

			if (this.gameState !== GameState.Countdown) return;
			if (!game.isPaused) {
				this.startGame();
				return;
			}

			if (elapsed % seconds(5) === 0) {
				// update description every 5 seconds
				this.setDescription(translation(ChallengeServerTranslation.DescriptionCountdown)
					.addArgs(translateTime(countdownTime - elapsed, "analog")));
			}

			if (countdownTime - elapsed > minutes(1)) {
				if (elapsed % seconds(30)) continue; // only log every 30 seconds
			} else if (countdownTime - elapsed > seconds(10)) {
				if (elapsed % seconds(10)) continue; // only log every 10 seconds
			}

			multiplayer.sendChatMessage(localPlayer, translation(ChallengeServerTranslation.Countdown)
				.addArgs(translateTime(countdownTime - elapsed))
				.getString());
		}

		this.startGame();
	}

	private startGame(): void {
		game.setPaused(false, PauseSource.Generic);
		multiplayer.sendChatMessage(localPlayer, translation(ChallengeServerTranslation.Start).getString());
		multiplayer.updateOptions({ newPlayerState: PlayerState.Ghost });

		this.elapsed = 0;
		this.continueGame();
	}

	private async continueGame(): Promise<void> {
		this.gameState = GameState.Playing;

		while (this.gameState === GameState.Playing) {
			if (this.elapsed % seconds(5) === 0) {
				// update description every 5 seconds
				this.setDescription(translation(ChallengeServerTranslation.DescriptionPlaying)
					.addArgs(translateTime(this.elapsed, "analog")));
			}

			await sleep(seconds(5));
			this.elapsed += seconds(5);
		}
	}

	private async startEndingCountdown(): Promise<void> {
		if (this.gameState !== GameState.Playing) return;

		this.gameState = GameState.Ending;

		const countdownTime = minutes(this.data.endingCountdownTime);

		for (let elapsed = 0; elapsed < countdownTime; elapsed += seconds(1)) {
			await sleep(seconds(1));

			if (this.gameState !== GameState.Ending) return;

			if (elapsed % seconds(5) === 0) {
				// update description every 5 seconds
				this.setDescription(translation(ChallengeServerTranslation.DescriptionEnding)
					.addArgs(this.winnerName, translateTime(countdownTime - elapsed, "analog")));
			}

			if (countdownTime - elapsed > seconds(30)) {
				if (elapsed % seconds(30)) continue; // only log every 30 seconds
			}

			if (elapsed % seconds(10)) continue; // only log every 10 seconds

			multiplayer.sendChatMessage(localPlayer, translation(ChallengeServerTranslation.EndingCountdown)
				.addArgs(translateTime(countdownTime - elapsed))
				.getString());
		}

		this.end();
	}

	private async end(): Promise<void> {
		await game.reset(false);
		await sleep(seconds(1));
		DedicatedServerManager.restart();
	}
}
