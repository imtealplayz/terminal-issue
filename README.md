# Teal Terminal

A prefix-only Discord bot that starts a simulated Linux-style terminal when a user sends `!terminal`.

## Setup
1. Install Node.js 18.18.0 or newer.
2. Clone or download this repository and run `npm install`.
3. Copy `.env.example` to `.env` and set `DISCORD_TOKEN=your_bot_token_here`.
4. In the Discord Developer Portal, enable **Message Content Intent** under Bot → Privileged Gateway Intents.
5. Invite the bot with the `bot` scope and permissions to View Channels, Send Messages, and Read Message History.
6. Run `npm start`.

## Usage
Send `!terminal` at the very beginning of a Discord message. Messages from that same user in that same channel are interpreted as terminal input until `exit` is entered.

Run `help` inside a session to see the complete command catalogue and descriptions. Use `help command` for a specific command.

## Included commands
More than 70 commands cover shell navigation, a virtual filesystem, system information, simulated networking, process and service simulation, and terminal effects.

## Safety and limitations
- This is a simulated environment, not a real shell.
- No Windows, Linux, PowerShell, CMD, or host operating-system commands are executed.
- Networking commands display fictional results and do not connect to hosts or download anything.
- Processes, services, permissions, and system operations are simulated.
- Each user has an isolated session per channel. Sessions and virtual files disappear when the bot stops or restarts.
- Every terminal response is wrapped in a triple-backtick Discord code block.
