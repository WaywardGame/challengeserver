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
import Player from "game/entity/player/Player";
import PlayerManager from "game/entity/player/PlayerManager";
import { Game } from "game/Game";
import Dictionary from "language/Dictionary";
import Mod from "mod/Mod";
import Component from "ui/component/Component";
interface IChallengeServerData {
    playersToWaitFor: number;
    countdownTime: number;
    endingCountdownTime: number;
    lastSurvivingPlayerWinsAutomatically: boolean;
}
export default class ChallengeServer extends Mod {
    static INSTANCE: ChallengeServer;
    dictionary: Dictionary;
    data: IChallengeServerData;
    private gameState;
    private contenders;
    private winnerName;
    private elapsed;
    initializeGlobalData(data?: IChallengeServerData): IChallengeServerData;
    initializeOptionsSection(section: Component): void;
    onGameStart(game: Game, isLoadingSave: boolean, playedCount: number): void;
    onPlayerJoin(manager: PlayerManager, player: Player): void;
    onPlayerLeave(manager: PlayerManager, player: Player): void;
    onPlayerDeath(player: Player): void;
    onSailToCivilization(player: Player): void;
    onUnload(): void;
    private setDescription;
    private waitForPlayers;
    private startCountdown;
    private startGame;
    private continueGame;
    private startEndingCountdown;
    private end;
}
export {};
