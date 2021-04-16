import { EventBus } from "event/EventBuses";
import { EventHandler } from "event/EventManager";
import { PlayerState } from "game/entity/player/IPlayer";
import Player from "game/entity/player/Player";
import { GameMode } from "game/options/IGameOptions";
import { Dictionary } from "language/Dictionaries";
import Translation from "language/Translation";
import { HookMethod } from "mod/IHookHost";
import Mod from "mod/Mod";
import Register from "mod/ModRegistry";
import { CheckButton } from "ui/component/CheckButton";
import Component from "ui/component/Component";
import { RangeRow } from "ui/component/RangeRow";
import Messages from "ui/screen/screens/game/static/Messages";
import { sleep } from "utilities/promise/Async";

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

function translation(id: ChallengeServerTranslation) {
	return new Translation(ChallengeServer.INSTANCE.dictionary, id);
}

function translateTime(time: number, type: "default" | "simple" | "analog" = "default") {
	time = Math.floor(time / 1000);
	if (type === "analog") {
		const secondsString = `${time % 60}`;
		return translation(ChallengeServerTranslation.TimeSimple).addArgs(Math.floor(time / 60), secondsString.length === 2 ? secondsString : `0${secondsString}`);
	}

	return translation(ChallengeServerTranslation.Time).addArgs(Math.floor(time / 60), time % 60, type === "simple");
}

function minutes(amt: number) {
	return amt * 60 * 1000;
}

function seconds(amt: number) {
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

	@Override public initializeGlobalData(data?: IChallengeServerData) {
		return data || {
			playersToWaitFor: 2,
			countdownTime: 5,
			endingCountdownTime: 2,
			lastSurvivingPlayerWinsAutomatically: true,
		};
	}

	@Register.optionsSection
	public initializeOptionsSection(section: Component) {
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

	@Override @HookMethod
	public onGameStart(isLoadingSave: boolean, playedCount: number) {
		if (game.getGameMode() !== GameMode.Challenge) return;

		game.setPaused(true);
		this.contenders = new Set();
		this.winnerName = undefined;
		sleep(seconds(1)).then(this.waitForPlayers);
	}

	@Override @HookMethod
	public onPlayerJoin(player: Player) {
		if (game.getGameMode() !== GameMode.Challenge) return;

		if (this.gameState === GameState.WaitingForPlayers || this.gameState === GameState.Countdown) {
			this.contenders.add(player.identifier);
			if (this.gameState === GameState.WaitingForPlayers && players.length - 1 >= this.data.playersToWaitFor) {
				this.startCountdown();
			}
		}

		if (this.gameState === GameState.Ending && !this.winnerName && player.state === PlayerState.None && this.contenders.has(player.identifier)) {
			// someone that left earlier rejoined, we continue the game for that person
			this.continueGame();
		}
	}

	@Override @HookMethod
	public onPlayerLeave(player: Player) {
		if (game.getGameMode() !== GameMode.Challenge) return;

		if (this.gameState === GameState.WaitingForPlayers) {
			this.contenders.delete(player.identifier);
		}

		// the players.length calculations in here are 1 off because the player hasn't actually left yet
		if (players.length - 2 < this.data.playersToWaitFor) {
			if (this.gameState === GameState.Countdown) {
				this.waitForPlayers();
			}

			if (!players.some(p => p !== player && p.state === PlayerState.None)) {
				// this was the last living player
				this.startEndingCountdown();
			}
		}
	}

	@EventHandler(EventBus.Players, "die")
	public onPlayerDeath(player: Player) {
		if (game.getGameMode() !== GameMode.Challenge)
			return;

		const remainingPlayers = players.filter(p => p !== player && p.state === PlayerState.None);
		if (remainingPlayers.length > 1)
			return;

		if (remainingPlayers.length === 1) {
			if (!this.data.lastSurvivingPlayerWinsAutomatically)
				return;

			this.winnerName = remainingPlayers[0].getName().getString();
			Messages.sendChatMessage(localPlayer, translation(ChallengeServerTranslation.WinByDefault)
				.addArgs(this.winnerName)
				.getString());
		}

		this.startEndingCountdown();
		return;
	}

	@Override @HookMethod
	public onSailToCivilization(player: Player) {
		if (game.getGameMode() !== GameMode.Challenge) return;

		this.winnerName = player.getName().getString();
		this.startEndingCountdown();
	}

	@Override public onUnload() {
		this.gameState = GameState.OutsideGame;
	}

	private setDescription(description: Translation) {
		multiplayer.updateOptions({ description: description.getString() });
		ui.refreshTranslations();
	}

	@Bound
	private waitForPlayers() {
		this.gameState = GameState.WaitingForPlayers;
		this.setDescription(translation(ChallengeServerTranslation.DescriptionWaiting));
	}

	private async startCountdown() {
		this.gameState = GameState.Countdown;

		// const countdownTime = seconds(30);
		const countdownTime = minutes(this.data.countdownTime);

		for (let elapsed = 0; elapsed < countdownTime; elapsed += seconds(1)) {
			await sleep(seconds(1));

			if (this.gameState !== GameState.Countdown) return;
			// tslint:disable-next-line no-boolean-literal-compare i think this can be undefined
			if (game.paused === false) {
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

			Messages.sendChatMessage(localPlayer, translation(ChallengeServerTranslation.Countdown)
				.addArgs(translateTime(countdownTime - elapsed))
				.getString());
		}

		this.startGame();
	}

	private startGame() {
		game.setPaused(false);
		Messages.sendChatMessage(localPlayer, translation(ChallengeServerTranslation.Start).getString());
		multiplayer.updateOptions({ newPlayerState: PlayerState.Ghost });

		this.elapsed = 0;
		this.continueGame();
	}

	private async continueGame() {
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

	private async startEndingCountdown() {
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

			Messages.sendChatMessage(localPlayer, translation(ChallengeServerTranslation.EndingCountdown)
				.addArgs(translateTime(countdownTime - elapsed))
				.getString());
		}

		this.end();
	}

	private async end() {
		await game.resetGameState(false);
		await sleep(seconds(1));
		game.restartDedicatedServer();
	}
}
