var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
define(["require", "exports", "Enums", "game/Difficulty", "language/Translation", "mod/IHookHost", "mod/Mod", "mod/ModRegistry", "newui/component/CheckButton", "newui/component/RangeInput", "newui/component/RangeRow", "newui/screen/screens/game/static/Messages", "utilities/Async", "utilities/Objects"], function (require, exports, Enums_1, Difficulty_1, Translation_1, IHookHost_1, Mod_1, ModRegistry_1, CheckButton_1, RangeInput_1, RangeRow_1, Messages_1, Async_1, Objects_1) {
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
        initializeOptionsSection(api, section) {
            new RangeRow_1.RangeRow(api)
                .setLabel(label => label.setText(translation(ChallengeServerTranslation.OptionCountdownTime)))
                .editRange(range => range
                .setMin(0.5)
                .setMax(10)
                .setStep(0.5)
                .setRefreshMethod(() => this.data.countdownTime))
                .on(RangeInput_1.RangeInputEvent.Finish, (_, value) => this.data.countdownTime = value)
                .setDisplayValue(value => translateTime(minutes(value), "analog"))
                .appendTo(section);
            new RangeRow_1.RangeRow(api)
                .setLabel(label => label.setText(translation(ChallengeServerTranslation.OptionEndingCountdownTime)))
                .editRange(range => range
                .setMin(0.5)
                .setMax(5)
                .setStep(0.5)
                .setRefreshMethod(() => this.data.endingCountdownTime))
                .on(RangeInput_1.RangeInputEvent.Finish, (_, value) => this.data.endingCountdownTime = value)
                .setDisplayValue(value => translateTime(minutes(value), "analog"))
                .appendTo(section);
            new RangeRow_1.RangeRow(api)
                .setLabel(label => label.setText(translation(ChallengeServerTranslation.OptionPlayersToWaitFor)))
                .editRange(range => range
                .setMin(2)
                .setMax(32)
                .setRefreshMethod(() => this.data.playersToWaitFor))
                .on(RangeInput_1.RangeInputEvent.Finish, (_, value) => this.data.playersToWaitFor = value)
                .setDisplayValue(true)
                .appendTo(section);
            new CheckButton_1.CheckButton(api)
                .setText(translation(ChallengeServerTranslation.OptionLastSurvivingPlayerWins))
                .setRefreshMethod(() => this.data.lastSurvivingPlayerWinsAutomatically)
                .on(CheckButton_1.CheckButtonEvent.Change, (_, checked) => { this.data.lastSurvivingPlayerWinsAutomatically = checked; })
                .appendTo(section);
        }
        onGameStart(isLoadingSave, playedCount) {
            if (game.getDifficulty() !== Difficulty_1.Difficulty.Challenge)
                return;
            game.setPaused(true);
            this.contenders = new Set();
            this.winnerName = undefined;
            Async_1.sleep(seconds(1)).then(this.waitForPlayers);
        }
        onPlayerJoin(player) {
            if (game.getDifficulty() !== Difficulty_1.Difficulty.Challenge)
                return;
            if (this.gameState === GameState.WaitingForPlayers || this.gameState === GameState.Countdown) {
                this.contenders.add(player.identifier);
                if (this.gameState === GameState.WaitingForPlayers && players.length - 1 >= this.data.playersToWaitFor) {
                    this.startCountdown();
                }
            }
            if (this.gameState === GameState.Ending && !this.winnerName && player.state === Enums_1.PlayerState.None && this.contenders.has(player.identifier)) {
                this.continueGame();
            }
        }
        onPlayerLeave(player) {
            if (game.getDifficulty() !== Difficulty_1.Difficulty.Challenge)
                return;
            if (this.gameState === GameState.WaitingForPlayers) {
                this.contenders.delete(player.identifier);
            }
            if (players.length - 2 < this.data.playersToWaitFor) {
                if (this.gameState === GameState.Countdown) {
                    this.waitForPlayers();
                }
                if (!players.some(p => p !== player && p.state === Enums_1.PlayerState.None)) {
                    this.startEndingCountdown();
                }
            }
        }
        onPlayerDeath(player) {
            if (game.getDifficulty() !== Difficulty_1.Difficulty.Challenge)
                return;
            const remainingPlayers = players.filter(p => p !== player && p.state === Enums_1.PlayerState.None);
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
            if (game.getDifficulty() !== Difficulty_1.Difficulty.Challenge)
                return;
            this.winnerName = player.getName().getString();
            this.startEndingCountdown();
        }
        onUnload() {
            this.gameState = GameState.OutsideGame;
        }
        setDescription(description) {
            multiplayer.updateOptions({ description: description.getString() });
            newui.refreshTranslations();
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
            multiplayer.updateOptions({ newPlayerState: Enums_1.PlayerState.Ghost });
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
        ModRegistry_1.default.optionsSection
    ], ChallengeServer.prototype, "initializeOptionsSection", null);
    __decorate([
        IHookHost_1.HookMethod
    ], ChallengeServer.prototype, "onGameStart", null);
    __decorate([
        IHookHost_1.HookMethod
    ], ChallengeServer.prototype, "onPlayerJoin", null);
    __decorate([
        IHookHost_1.HookMethod
    ], ChallengeServer.prototype, "onPlayerLeave", null);
    __decorate([
        IHookHost_1.HookMethod
    ], ChallengeServer.prototype, "onPlayerDeath", null);
    __decorate([
        IHookHost_1.HookMethod
    ], ChallengeServer.prototype, "onSailToCivilization", null);
    __decorate([
        Objects_1.Bound
    ], ChallengeServer.prototype, "waitForPlayers", null);
    __decorate([
        Mod_1.default.instance("Challenge Server")
    ], ChallengeServer, "INSTANCE", void 0);
    exports.default = ChallengeServer;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ2hhbGxlbmdlU2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL0NoYWxsZW5nZVNlcnZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7SUFpQkEsSUFBSyxTQU1KO0lBTkQsV0FBSyxTQUFTO1FBQ2IsdURBQVcsQ0FBQTtRQUNYLG1FQUFpQixDQUFBO1FBQ2pCLG1EQUFTLENBQUE7UUFDVCwrQ0FBTyxDQUFBO1FBQ1AsNkNBQU0sQ0FBQTtJQUNQLENBQUMsRUFOSSxTQUFTLEtBQVQsU0FBUyxRQU1iO0lBRUQsSUFBSywwQkFlSjtJQWZELFdBQUssMEJBQTBCO1FBQzlCLHFGQUFTLENBQUE7UUFDVCxpR0FBZSxDQUFBO1FBQ2YsNkVBQUssQ0FBQTtRQUNMLDJHQUFvQixDQUFBO1FBQ3BCLHVHQUFrQixDQUFBO1FBQ2xCLHVHQUFrQixDQUFBO1FBQ2xCLHFHQUFpQixDQUFBO1FBQ2pCLDJFQUFJLENBQUE7UUFDSix1RkFBVSxDQUFBO1FBQ1YsMkZBQVksQ0FBQTtRQUNaLDBHQUFtQixDQUFBO1FBQ25CLHNIQUF5QixDQUFBO1FBQ3pCLGdIQUFzQixDQUFBO1FBQ3RCLDhIQUE2QixDQUFBO0lBQzlCLENBQUMsRUFmSSwwQkFBMEIsS0FBMUIsMEJBQTBCLFFBZTlCO0lBRUQsU0FBUyxXQUFXLENBQUMsRUFBOEI7UUFDbEQsT0FBTyxJQUFJLHFCQUFXLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDakUsQ0FBQztJQUVELFNBQVMsYUFBYSxDQUFDLElBQVksRUFBRSxPQUF3QyxTQUFTO1FBQ3JGLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsQ0FBQztRQUMvQixJQUFJLElBQUksS0FBSyxRQUFRLEVBQUU7WUFDdEIsTUFBTSxhQUFhLEdBQUcsR0FBRyxJQUFJLEdBQUcsRUFBRSxFQUFFLENBQUM7WUFDckMsT0FBTyxXQUFX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