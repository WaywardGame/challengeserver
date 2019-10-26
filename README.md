# Challenge Server
A server-side mod which automatically runs challenge games.

1. Install the mod by cloning it or downloading as a ZIP. The mod's folder should be in your local mods folder: `Steam\steamapps\common\Wayward\mods`.
2. Launch a dedicated server in challenge mode. Example: `wayward.exe +server +new +difficulty challenge`
3. The game begins paused, and the server description will say "waiting for players".
4. When enough players have joined (defaults to 2), a countdown will begin. When the countdown ends, the game starts.
  - Any players that join after this point will be ghosts.
5. When there's only one player left alive, a player completes the challenge, or everyone dies, the game ends.
6. There will be an "ending" countdown, and then it will make a new game and the cycle will continue.
7. You can configure the length of the countdowns, the number of players required to start the challenge, and whether the last living player should win by default in the options menu.


## Editing the mod

Cloning/Setup:
```
git clone https://github.com/WaywardGame/challengeserver.git
cd challengeserver
On Windows: path/to/wayward/install/wayward.cmd +mod update .
On macOS: path/to/wayward/install/Wayward.app/Contents/MacOS/Electron +mod update .
On Linux: path/to/wayward/install/wayward +mod update .
```

To build:
Open the folder in Visual Studio Code and build with Ctrl+Shift+B.
