var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
define(["require", "exports", "entity/player/IPlayer", "game/options/IGameOptions", "language/Translation", "mod/IHookHost", "mod/Mod", "mod/ModRegistry", "newui/component/CheckButton", "newui/component/RangeRow", "newui/NewUi", "newui/screen/screens/game/static/Messages", "utilities/Async"], function (require, exports, IPlayer_1, IGameOptions_1, Translation_1, IHookHost_1, Mod_1, ModRegistry_1, CheckButton_1, RangeRow_1, NewUi_1, Messages_1, Async_1) {
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
            if (remainingPlayers.length > 1) {
                return;
            }
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
            await game.resetGameState(true);
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
        Override, IHookHost_1.HookMethod
    ], ChallengeServer.prototype, "onGameStart", null);
    __decorate([
        Override, IHookHost_1.HookMethod
    ], ChallengeServer.prototype, "onPlayerJoin", null);
    __decorate([
        Override, IHookHost_1.HookMethod
    ], ChallengeServer.prototype, "onPlayerLeave", null);
    __decorate([
        Override, IHookHost_1.HookMethod
    ], ChallengeServer.prototype, "onPlayerDeath", null);
    __decorate([
        Override, IHookHost_1.HookMethod
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ2hhbGxlbmdlU2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL0NoYWxsZW5nZVNlcnZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7SUFlQSxJQUFLLFNBTUo7SUFORCxXQUFLLFNBQVM7UUFDYix1REFBVyxDQUFBO1FBQ1gsbUVBQWlCLENBQUE7UUFDakIsbURBQVMsQ0FBQTtRQUNULCtDQUFPLENBQUE7UUFDUCw2Q0FBTSxDQUFBO0lBQ1AsQ0FBQyxFQU5JLFNBQVMsS0FBVCxTQUFTLFFBTWI7SUFFRCxJQUFLLDBCQWVKO0lBZkQsV0FBSywwQkFBMEI7UUFDOUIscUZBQVMsQ0FBQTtRQUNULGlHQUFlLENBQUE7UUFDZiw2RUFBSyxDQUFBO1FBQ0wsMkdBQW9CLENBQUE7UUFDcEIsdUdBQWtCLENBQUE7UUFDbEIsdUdBQWtCLENBQUE7UUFDbEIscUdBQWlCLENBQUE7UUFDakIsMkVBQUksQ0FBQTtRQUNKLHVGQUFVLENBQUE7UUFDViwyRkFBWSxDQUFBO1FBQ1osMEdBQW1CLENBQUE7UUFDbkIsc0hBQXlCLENBQUE7UUFDekIsZ0hBQXNCLENBQUE7UUFDdEIsOEhBQTZCLENBQUE7SUFDOUIsQ0FBQyxFQWZJLDBCQUEwQixLQUExQiwwQkFBMEIsUUFlOUI7SUFFRCxTQUFTLFdBQVcsQ0FBQyxFQUE4QjtRQUNsRCxPQUFPLElBQUkscUJBQVcsQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUNqRSxDQUFDO0lBRUQsU0FBUyxhQUFhLENBQUMsSUFBWSxFQUFFLE9BQXdDLFNBQVM7UUFDckYsSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxDQUFDO1FBQy9CLElBQUksSUFBSSxLQUFLLFFBQVEsRUFBRTtZQUN0QixNQUFNLGFBQWEsR0FBRyxHQUFHLElBQUksR0FBRyxFQUFFLEVBQUUsQ0FBQztZQUNyQyxPQUFPLFdBQVcs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