var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
define(["require", "exports", "event/EventBuses", "event/EventManager", "game/entity/player/IPlayer", "game/meta/DedicatedServerManager", "game/options/IGameOptions", "language/Translation", "mod/Mod", "mod/ModRegistry", "ui/component/CheckButton", "ui/component/RangeRow", "utilities/Decorators", "utilities/promise/Async"], function (require, exports, EventBuses_1, EventManager_1, IPlayer_1, DedicatedServerManager_1, IGameOptions_1, Translation_1, Mod_1, ModRegistry_1, CheckButton_1, RangeRow_1, Decorators_1, Async_1) {
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
            game.setPaused(true);
            this.contenders = new Set();
            this.winnerName = undefined;
            (0, Async_1.sleep)(seconds(1)).then(this.waitForPlayers);
        }
        onPlayerJoin(manager, player) {
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
        onPlayerLeave(manager, player) {
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
                multiplayer.sendChatMessage(localPlayer, translation(ChallengeServerTranslation.Countdown)
                    .addArgs(translateTime(countdownTime - elapsed))
                    .getString());
            }
            this.startGame();
        }
        startGame() {
            game.setPaused(false);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ2hhbGxlbmdlU2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL0NoYWxsZW5nZVNlcnZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7SUFrQkEsSUFBSyxTQU1KO0lBTkQsV0FBSyxTQUFTO1FBQ2IsdURBQVcsQ0FBQTtRQUNYLG1FQUFpQixDQUFBO1FBQ2pCLG1EQUFTLENBQUE7UUFDVCwrQ0FBTyxDQUFBO1FBQ1AsNkNBQU0sQ0FBQTtJQUNQLENBQUMsRUFOSSxTQUFTLEtBQVQsU0FBUyxRQU1iO0lBRUQsSUFBSywwQkFlSjtJQWZELFdBQUssMEJBQTBCO1FBQzlCLHFGQUFTLENBQUE7UUFDVCxpR0FBZSxDQUFBO1FBQ2YsNkVBQUssQ0FBQTtRQUNMLDJHQUFvQixDQUFBO1FBQ3BCLHVHQUFrQixDQUFBO1FBQ2xCLHVHQUFrQixDQUFBO1FBQ2xCLHFHQUFpQixDQUFBO1FBQ2pCLDJFQUFJLENBQUE7UUFDSix1RkFBVSxDQUFBO1FBQ1YsMkZBQVksQ0FBQTtRQUNaLDBHQUFtQixDQUFBO1FBQ25CLHNIQUF5QixDQUFBO1FBQ3pCLGdIQUFzQixDQUFBO1FBQ3RCLDhIQUE2QixDQUFBO0lBQzlCLENBQUMsRUFmSSwwQkFBMEIsS0FBMUIsMEJBQTBCLFFBZTlCO0lBRUQsU0FBUyxXQUFXLENBQUMsRUFBOEI7UUFDbEQsT0FBTyxxQkFBVyxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUNqRSxDQUFDO0lBRUQsU0FBUyxhQUFhLENBQUMsSUFBWSxFQUFFLE9BQXdDLFNBQVM7UUFDckYsSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxDQUFDO1FBQy9CLElBQUksSUFBSSxLQUFLLFFBQVEsRUFBRTtZQUN0QixNQUFNLGFBQWEsR0FBRyxHQUFHLElBQUksR0FBRyxFQUFFLEVBQUUsQ0FBQztZQUNyQyxPQUFP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