var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
define(["require", "exports", "event/EventBuses", "event/EventManager", "game/entity/player/IPlayer", "game/IGame", "game/meta/DedicatedServerManager", "game/options/IGameOptions", "language/Translation", "mod/Mod", "mod/ModRegistry", "ui/component/CheckButton", "ui/component/RangeRow", "utilities/Decorators", "utilities/promise/Async"], function (require, exports, EventBuses_1, EventManager_1, IPlayer_1, IGame_1, DedicatedServerManager_1, IGameOptions_1, Translation_1, Mod_1, ModRegistry_1, CheckButton_1, RangeRow_1, Decorators_1, Async_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var GameState;
    (function (GameState) {
        GameState[GameState["OutsideGame"] = 0] = "OutsideGame";
        GameState[GameState["WaitingForPlayers"] = 1] = "WaitingForPlayers";
        GameState[GameState["Countdown"] = 2] = "Countdown";
        GameState[GameState["Playing"] = 3] = "Playing";
        GameState[GameState["Ending"] = 4] = "Ending";
    })(GameState || (GameState = {}));
    var ChallengeServerTranslation;
    (function (ChallengeServerTranslation) {
        ChallengeServerTranslation[ChallengeServerTranslation["Countdown"] = 0] = "Countdown";
        ChallengeServerTranslation[ChallengeServerTranslation["EndingCountdown"] = 1] = "EndingCountdown";
        ChallengeServerTranslation[ChallengeServerTranslation["Start"] = 2] = "Start";
        ChallengeServerTranslation[ChallengeServerTranslation["DescriptionCountdown"] = 3] = "DescriptionCountdown";
        ChallengeServerTranslation[ChallengeServerTranslation["DescriptionWaiting"] = 4] = "DescriptionWaiting";
        ChallengeServerTranslation[ChallengeServerTranslation["DescriptionPlaying"] = 5] = "DescriptionPlaying";
        ChallengeServerTranslation[ChallengeServerTranslation["DescriptionEnding"] = 6] = "DescriptionEnding";
        ChallengeServerTranslation[ChallengeServerTranslation["Time"] = 7] = "Time";
        ChallengeServerTranslation[ChallengeServerTranslation["TimeSimple"] = 8] = "TimeSimple";
        ChallengeServerTranslation[ChallengeServerTranslation["WinByDefault"] = 9] = "WinByDefault";
        ChallengeServerTranslation[ChallengeServerTranslation["OptionCountdownTime"] = 10] = "OptionCountdownTime";
        ChallengeServerTranslation[ChallengeServerTranslation["OptionEndingCountdownTime"] = 11] = "OptionEndingCountdownTime";
        ChallengeServerTranslation[ChallengeServerTranslation["OptionPlayersToWaitFor"] = 12] = "OptionPlayersToWaitFor";
        ChallengeServerTranslation[ChallengeServerTranslation["OptionLastSurvivingPlayerWins"] = 13] = "OptionLastSurvivingPlayerWins";
    })(ChallengeServerTranslation || (ChallengeServerTranslation = {}));
    function translation(id) {
        return Translation_1.default.get(ChallengeServer.INSTANCE.dictionary, id);
    }
    function translateTime(time, type = "default") {
        time = Math.floor(time / 1000);
        if (type === "analog") {
            const secondsString = `${time % 60}`;
            return translation(ChallengeServerTranslation.TimeSimple).addArgs(Math.floor(time / 60), secondsString.length === 2 ? secondsString : `0${secondsString}`);
        }
        return translation(ChallengeServerTranslation.Time).addArgs(Math.floor(time / 60), time % 60, type === "simple");
    }
    function minutes(amt) {
        return amt * 60 * 1000;
    }
    function seconds(amt) {
        return amt * 1000;
    }
    class ChallengeServer extends Mod_1.default {
        constructor() {
            super(...arguments);
            this.gameState = GameState.OutsideGame;
        }
        initializeGlobalData(data) {
            return data || {
                playersToWaitFor: 2,
                countdownTime: 5,
                endingCountdownTime: 2,
                lastSurvivingPlayerWinsAutomatically: true,
            };
        }
        initializeOptionsSection(section) {
            new RangeRow_1.RangeRow()
                .setLabel(label => label.setText(translation(ChallengeServerTranslation.OptionCountdownTime)))
                .editRange(range => range
                .setMin(0.5)
                .setMax(10)
                .setStep(0.5)
                .setRefreshMethod(() => this.data.countdownTime))
                .event.subscribe("finish", (_, value) => this.data.countdownTime = value)
                .setDisplayValue(value => translateTime(minutes(value), "analog"))
                .appendTo(section);
            new RangeRow_1.RangeRow()
                .setLabel(label => label.setText(translation(ChallengeServerTranslation.OptionEndingCountdownTime)))
                .editRange(range => range
                .setMin(0.5)
                .setMax(5)
                .setStep(0.5)
                .setRefreshMethod(() => this.data.endingCountdownTime))
                .event.subscribe("finish", (_, value) => this.data.endingCountdownTime = value)
                .setDisplayValue(value => translateTime(minutes(value), "analog"))
                .appendTo(section);
            new RangeRow_1.RangeRow()
                .setLabel(label => label.setText(translation(ChallengeServerTranslation.OptionPlayersToWaitFor)))
                .editRange(range => range
                .setMin(2)
                .setMax(32)
                .setRefreshMethod(() => this.data.playersToWaitFor))
                .event.subscribe("finish", (_, value) => this.data.playersToWaitFor = value)
                .setDisplayValue(true)
                .appendTo(section);
            new CheckButton_1.CheckButton()
                .setText(translation(ChallengeServerTranslation.OptionLastSurvivingPlayerWins))
                .setRefreshMethod(() => this.data.lastSurvivingPlayerWinsAutomatically)
                .event.subscribe("toggle", (_, checked) => { this.data.lastSurvivingPlayerWinsAutomatically = checked; })
                .appendTo(section);
        }
        onGameStart(game, isLoadingSave, playedCount) {
            if (game.getGameMode() !== IGameOptions_1.GameMode.Challenge)
                return;
            game.setPaused(true, IGame_1.PauseSource.Generic);
            this.contenders = new Set();
            this.winnerName = undefined;
            (0, Async_1.sleep)(seconds(1)).then(this.waitForPlayers);
        }
        onPlayerJoin(manager, player) {
            if (game.getGameMode() !== IGameOptions_1.GameMode.Challenge)
                return;
            if (this.gameState === GameState.WaitingForPlayers || this.gameState === GameState.Countdown) {
                this.contenders.add(player.identifier);
                if (this.gameState === GameState.WaitingForPlayers && game.playerManager.getAll(true, true).length >= this.data.playersToWaitFor) {
                    this.startCountdown();
                }
            }
            if (this.gameState === GameState.Ending && !this.winnerName && player.state === IPlayer_1.PlayerState.None && this.contenders.has(player.identifier)) {
                this.continueGame();
            }
        }
        onPlayerLeave(manager, player) {
            if (game.getGameMode() !== IGameOptions_1.GameMode.Challenge)
                return;
            if (this.gameState === GameState.WaitingForPlayers) {
                this.contenders.delete(player.identifier);
            }
            const allPlayers = game.playerManager.getAll(true, true);
            if (allPlayers.length - 2 < this.data.playersToWaitFor) {
                if (this.gameState === GameState.Countdown) {
                    this.waitForPlayers();
                }
                if (!allPlayers.some(p => p !== player && p.state === IPlayer_1.PlayerState.None)) {
                    this.startEndingCountdown();
                }
            }
        }
        onPlayerDeath(player) {
            if (game.getGameMode() !== IGameOptions_1.GameMode.Challenge)
                return;
            const remainingPlayers = game.playerManager.getAll(true, true).filter(p => p !== player && p.state === IPlayer_1.PlayerState.None);
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
        onSailToCivilization(player) {
            if (game.getGameMode() !== IGameOptions_1.GameMode.Challenge)
                return;
            this.winnerName = player.getName().getString();
            this.startEndingCountdown();
        }
        onUnload() {
            this.gameState = GameState.OutsideGame;
        }
        setDescription(description) {
            multiplayer.updateOptions({ description: description.getString() });
            ui.refreshTranslations();
        }
        waitForPlayers() {
            this.gameState = GameState.WaitingForPlayers;
            this.setDescription(translation(ChallengeServerTranslation.DescriptionWaiting));
        }
        async startCountdown() {
            this.gameState = GameState.Countdown;
            const countdownTime = minutes(this.data.countdownTime);
            for (let elapsed = 0; elapsed < countdownTime; elapsed += seconds(1)) {
                await (0, Async_1.sleep)(seconds(1));
                if (this.gameState !== GameState.Countdown)
                    return;
                if (!game.isPaused) {
                    this.startGame();
                    return;
                }
                if (elapsed % seconds(5) === 0) {
                    this.setDescription(translation(ChallengeServerTranslation.DescriptionCountdown)
                        .addArgs(translateTime(countdownTime - elapsed, "analog")));
                }
                if (countdownTime - elapsed > minutes(1)) {
                    if (elapsed % seconds(30))
                        continue;
                }
                else if (countdownTime - elapsed > seconds(10)) {
                    if (elapsed % seconds(10))
                        continue;
                }
                multiplayer.sendChatMessage(localPlayer, translation(ChallengeServerTranslation.Countdown)
                    .addArgs(translateTime(countdownTime - elapsed))
                    .getString());
            }
            this.startGame();
        }
        startGame() {
            game.setPaused(false, IGame_1.PauseSource.Generic);
            multiplayer.sendChatMessage(localPlayer, translation(ChallengeServerTranslation.Start).getString());
            multiplayer.updateOptions({ newPlayerState: IPlayer_1.PlayerState.Ghost });
            this.elapsed = 0;
            this.continueGame();
        }
        async continueGame() {
            this.gameState = GameState.Playing;
            while (this.gameState === GameState.Playing) {
                if (this.elapsed % seconds(5) === 0) {
                    this.setDescription(translation(ChallengeServerTranslation.DescriptionPlaying)
                        .addArgs(translateTime(this.elapsed, "analog")));
                }
                await (0, Async_1.sleep)(seconds(5));
                this.elapsed += seconds(5);
            }
        }
        async startEndingCountdown() {
            if (this.gameState !== GameState.Playing)
                return;
            this.gameState = GameState.Ending;
            const countdownTime = minutes(this.data.endingCountdownTime);
            for (let elapsed = 0; elapsed < countdownTime; elapsed += seconds(1)) {
                await (0, Async_1.sleep)(seconds(1));
                if (this.gameState !== GameState.Ending)
                    return;
                if (elapsed % seconds(5) === 0) {
                    this.setDescription(translation(ChallengeServerTranslation.DescriptionEnding)
                        .addArgs(this.winnerName, translateTime(countdownTime - elapsed, "analog")));
                }
                if (countdownTime - elapsed > seconds(30)) {
                    if (elapsed % seconds(30))
                        continue;
                }
                if (elapsed % seconds(10))
                    continue;
                multiplayer.sendChatMessage(localPlayer, translation(ChallengeServerTranslation.EndingCountdown)
                    .addArgs(translateTime(countdownTime - elapsed))
                    .getString());
            }
            this.end();
        }
        async end() {
            await game.reset(false);
            await (0, Async_1.sleep)(seconds(1));
            DedicatedServerManager_1.default.restart();
        }
    }
    __decorate([
        ModRegistry_1.default.dictionary("dictionary", ChallengeServerTranslation)
    ], ChallengeServer.prototype, "dictionary", void 0);
    __decorate([
        Mod_1.default.globalData("Challenge Server")
    ], ChallengeServer.prototype, "data", void 0);
    __decorate([
        ModRegistry_1.default.optionsSection
    ], ChallengeServer.prototype, "initializeOptionsSection", null);
    __decorate([
        (0, EventManager_1.EventHandler)(EventBuses_1.EventBus.Game, "play")
    ], ChallengeServer.prototype, "onGameStart", null);
    __decorate([
        (0, EventManager_1.EventHandler)(EventBuses_1.EventBus.PlayerManager, "join")
    ], ChallengeServer.prototype, "onPlayerJoin", null);
    __decorate([
        (0, EventManager_1.EventHandler)(EventBuses_1.EventBus.PlayerManager, "leave")
    ], ChallengeServer.prototype, "onPlayerLeave", null);
    __decorate([
        (0, EventManager_1.EventHandler)(EventBuses_1.EventBus.Players, "die")
    ], ChallengeServer.prototype, "onPlayerDeath", null);
    __decorate([
        (0, EventManager_1.EventHandler)(EventBuses_1.EventBus.Players, "sailToCivilization")
    ], ChallengeServer.prototype, "onSailToCivilization", null);
    __decorate([
        Decorators_1.Bound
    ], ChallengeServer.prototype, "waitForPlayers", null);
    __decorate([
        Mod_1.default.instance("Challenge Server")
    ], ChallengeServer, "INSTANCE", void 0);
    exports.default = ChallengeServer;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ2hhbGxlbmdlU2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL0NoYWxsZW5nZVNlcnZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7SUFtQkEsSUFBSyxTQU1KO0lBTkQsV0FBSyxTQUFTO1FBQ2IsdURBQVcsQ0FBQTtRQUNYLG1FQUFpQixDQUFBO1FBQ2pCLG1EQUFTLENBQUE7UUFDVCwrQ0FBTyxDQUFBO1FBQ1AsNkNBQU0sQ0FBQTtJQUNQLENBQUMsRUFOSSxTQUFTLEtBQVQsU0FBUyxRQU1iO0lBRUQsSUFBSywwQkFlSjtJQWZELFdBQUssMEJBQTBCO1FBQzlCLHFGQUFTLENBQUE7UUFDVCxpR0FBZSxDQUFBO1FBQ2YsNkVBQUssQ0FBQTtRQUNMLDJHQUFvQixDQUFBO1FBQ3BCLHVHQUFrQixDQUFBO1FBQ2xCLHVHQUFrQixDQUFBO1FBQ2xCLHFHQUFpQixDQUFBO1FBQ2pCLDJFQUFJLENBQUE7UUFDSix1RkFBVSxDQUFBO1FBQ1YsMkZBQVksQ0FBQTtRQUNaLDBHQUFtQixDQUFBO1FBQ25CLHNIQUF5QixDQUFBO1FBQ3pCLGdIQUFzQixDQUFBO1FBQ3RCLDhIQUE2QixDQUFBO0lBQzlCLENBQUMsRUFmSSwwQkFBMEIsS0FBMUIsMEJBQTBCLFFBZTlCO0lBRUQsU0FBUyxXQUFXLENBQUMsRUFBOEI7UUFDbEQsT0FBTyxxQkFBVyxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUNqRSxDQUFDO0lBRUQsU0FBUyxhQUFhLENBQUMsSUFBWSxFQUFFLE9BQXdDLFNBQVM7UUFDckYsSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxDQUFDO1FBQy9CLElBQUksSUFBSSxLQUFLLFFBQVEsRUFBRTtZQUN0QixNQUFNLGFBQWEsR0FBRyxHQUFHLElBQUksR0FBRyxFQUFFLEVBQUUsQ0FBQztZQUNyQyxPQUFP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