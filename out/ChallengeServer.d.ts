import Player from "entity/player/Player";
import { Dictionary } from "language/Dictionaries";
import Mod from "mod/Mod";
import Component from "newui/component/Component";
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
    onGameStart(isLoadingSave: boolean, playedCount: number): void;
    onPlayerJoin(player: Player): void;
    onPlayerLeave(player: Player): void;
    onPlayerDeath(player: Player): boolean | undefined;
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
