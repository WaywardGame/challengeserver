import { Dictionary } from "language/Dictionaries";
import Mod from "mod/Mod";
import Component from "newui/component/Component";
import { UiApi } from "newui/INewUi";
import IPlayer from "player/IPlayer";
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
    initializeOptionsSection(api: UiApi, section: Component): void;
    onGameStart(isLoadingSave: boolean, playedCount: number): void;
    onPlayerJoin(player: IPlayer): void;
    onPlayerLeave(player: IPlayer): void;
    onPlayerDeath(player: IPlayer): boolean | undefined;
    onSailToCivilization(player: IPlayer): void;
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
