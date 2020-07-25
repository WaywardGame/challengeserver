var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
define(["require", "exports", "entity/player/IPlayer", "event/EventBuses", "event/EventManager", "game/options/IGameOptions", "language/Translation", "mod/IHookHost", "mod/Mod", "mod/ModRegistry", "newui/component/CheckButton", "newui/component/RangeRow", "newui/NewUi", "newui/screen/screens/game/static/Messages", "utilities/Async"], function (require, exports, IPlayer_1, EventBuses_1, EventManager_1, IGameOptions_1, Translation_1, IHookHost_1, Mod_1, ModRegistry_1, CheckButton_1, RangeRow_1, NewUi_1, Messages_1, Async_1) {
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
        return new Translation_1.default(ChallengeServer.INSTANCE.dictionary, id);
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
        onGameStart(isLoadingSave, playedCount) {
            if (game.getGameMode() !== IGameOptions_1.GameMode.Challenge)
                return;
            game.setPaused(true);
            this.contenders = new Set();
            this.winnerName = undefined;
            Async_1.sleep(seconds(1)).then(this.waitForPlayers);
        }
        onPlayerJoin(player) {
            if (game.getGameMode() !== IGameOptions_1.GameMode.Challenge)
                return;
            if (this.gameState === GameState.WaitingForPlayers || this.gameState === GameState.Countdown) {
                this.contenders.add(player.identifier);
                if (this.gameState === GameState.WaitingForPlayers && players.length - 1 >= this.data.playersToWaitFor) {
                    this.startCountdown();
                }
            }
            if (this.gameState === GameState.Ending && !this.winnerName && player.state === IPlayer_1.PlayerState.None && this.contenders.has(player.identifier)) {
                this.continueGame();
            }
        }
        onPlayerLeave(player) {
            if (game.getGameMode() !== IGameOptions_1.GameMode.Challenge)
                return;
            if (this.gameState === GameState.WaitingForPlayers) {
                this.contenders.delete(player.identifier);
            }
            if (players.length - 2 < this.data.playersToWaitFor) {
                if (this.gameState === GameState.Countdown) {
                    this.waitForPlayers();
                }
                if (!players.some(p => p !== player && p.state === IPlayer_1.PlayerState.None)) {
                    this.startEndingCountdown();
                }
            }
        }
        onPlayerDeath(player) {
            if (game.getGameMode() !== IGameOptions_1.GameMode.Challenge)
                return;
            const remainingPlayers = players.filter(p => p !== player && p.state === IPlayer_1.PlayerState.None);
            if (remainingPlayers.length > 1)
                return;
            if (remainingPlayers.length === 1) {
                if (!this.data.lastSurvivingPlayerWinsAutomatically)
                    return;
                this.winnerName = remainingPlayers[0].getName().getString();
                Messages_1.default.sendChatMessage(localPlayer, translation(ChallengeServerTranslation.WinByDefault)
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
            NewUi_1.default.refreshTranslations();
        }
        waitForPlayers() {
            this.gameState = GameState.WaitingForPlayers;
            this.setDescription(translation(ChallengeServerTranslation.DescriptionWaiting));
        }
        async startCountdown() {
            this.gameState = GameState.Countdown;
            const countdownTime = minutes(this.data.countdownTime);
            for (let elapsed = 0; elapsed < countdownTime; elapsed += seconds(1)) {
                await Async_1.sleep(seconds(1));
                if (this.gameState !== GameState.Countdown)
                    return;
                if (game.paused === false) {
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
                Messages_1.default.sendChatMessage(localPlayer, translation(ChallengeServerTranslation.Countdown)
                    .addArgs(translateTime(countdownTime - elapsed))
                    .getString());
            }
            this.startGame();
        }
        startGame() {
            game.setPaused(false);
            Messages_1.default.sendChatMessage(localPlayer, translation(ChallengeServerTranslation.Start).getString());
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
                await Async_1.sleep(seconds(5));
                this.elapsed += seconds(5);
            }
        }
        async startEndingCountdown() {
            if (this.gameState !== GameState.Playing)
                return;
            this.gameState = GameState.Ending;
            const countdownTime = minutes(this.data.endingCountdownTime);
            for (let elapsed = 0; elapsed < countdownTime; elapsed += seconds(1)) {
                await Async_1.sleep(seconds(1));
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
                Messages_1.default.sendChatMessage(localPlayer, translation(ChallengeServerTranslation.EndingCountdown)
                    .addArgs(translateTime(countdownTime - elapsed))
                    .getString());
            }
            this.end();
        }
        async end() {
            await game.resetGameState(false);
            await Async_1.sleep(seconds(1));
            game.restartDedicatedServer();
        }
    }
    __decorate([
        ModRegistry_1.default.dictionary("dictionary", ChallengeServerTranslation)
    ], ChallengeServer.prototype, "dictionary", void 0);
    __decorate([
        Mod_1.default.globalData("Challenge Server")
    ], ChallengeServer.prototype, "data", void 0);
    __decorate([
        Override
    ], ChallengeServer.prototype, "initializeGlobalData", null);
    __decorate([
        ModRegistry_1.default.optionsSection
    ], ChallengeServer.prototype, "initializeOptionsSection", null);
    __decorate([
        Override,
        IHookHost_1.HookMethod
    ], ChallengeServer.prototype, "onGameStart", null);
    __decorate([
        Override,
        IHookHost_1.HookMethod
    ], ChallengeServer.prototype, "onPlayerJoin", null);
    __decorate([
        Override,
        IHookHost_1.HookMethod
    ], ChallengeServer.prototype, "onPlayerLeave", null);
    __decorate([
        EventManager_1.EventHandler(EventBuses_1.EventBus.Players, "die")
    ], ChallengeServer.prototype, "onPlayerDeath", null);
    __decorate([
        Override,
        IHookHost_1.HookMethod
    ], ChallengeServer.prototype, "onSailToCivilization", null);
    __decorate([
        Override
    ], ChallengeServer.prototype, "onUnload", null);
    __decorate([
        Bound
    ], ChallengeServer.prototype, "waitForPlayers", null);
    __decorate([
        Mod_1.default.instance("Challenge Server")
    ], ChallengeServer, "INSTANCE", void 0);
    exports.default = ChallengeServer;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ2hhbGxlbmdlU2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL0NoYWxsZW5nZVNlcnZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7SUFpQkEsSUFBSyxTQU1KO0lBTkQsV0FBSyxTQUFTO1FBQ2IsdURBQVcsQ0FBQTtRQUNYLG1FQUFpQixDQUFBO1FBQ2pCLG1EQUFTLENBQUE7UUFDVCwrQ0FBTyxDQUFBO1FBQ1AsNkNBQU0sQ0FBQTtJQUNQLENBQUMsRUFOSSxTQUFTLEtBQVQsU0FBUyxRQU1iO0lBRUQsSUFBSywwQkFlSjtJQWZELFdBQUssMEJBQTBCO1FBQzlCLHFGQUFTLENBQUE7UUFDVCxpR0FBZSxDQUFBO1FBQ2YsNkVBQUssQ0FBQTtRQUNMLDJHQUFvQixDQUFBO1FBQ3BCLHVHQUFrQixDQUFBO1FBQ2xCLHVHQUFrQixDQUFBO1FBQ2xCLHFHQUFpQixDQUFBO1FBQ2pCLDJFQUFJLENBQUE7UUFDSix1RkFBVSxDQUFBO1FBQ1YsMkZBQVksQ0FBQTtRQUNaLDBHQUFtQixDQUFBO1FBQ25CLHNIQUF5QixDQUFBO1FBQ3pCLGdIQUFzQixDQUFBO1FBQ3RCLDhIQUE2QixDQUFBO0lBQzlCLENBQUMsRUFmSSwwQkFBMEIsS0FBMUIsMEJBQTBCLFFBZTlCO0lBRUQsU0FBUyxXQUFXLENBQUMsRUFBOEI7UUFDbEQsT0FBTyxJQUFJLHFCQUFXLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDakUsQ0FBQztJQUVELFNBQVMsYUFBYSxDQUFDLElBQVksRUFBRSxPQUF3QyxTQUFTO1FBQ3JGLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsQ0FBQztRQUMvQixJQUFJLElBQUksS0FBSyxRQUFRLEVBQUU7WUFDdEIsTUFBTSxhQUFhLEdBQUcsR0FBRyxJQUFJLEdBQUcsRUFBRSxFQUFFLENBQUM7WUFDckMsT0FBTyxXQUFX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