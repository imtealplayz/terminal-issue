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

Run `help` inside a session to see all 123 commands and descriptions. Use `help command` for details about one command.

## Main command areas
- Shell navigation and conveniences: `pwd`, `ls`, `cd`, `tree`, `find`, `basename`, `dirname`, aliases and directory stack commands.
- Virtual filesystem: `mkdir`, `touch`, `cat`, `echo`, `cp`, `mv`, `rm`, `grep`, `sed`, `diff`, checksums, Base64 and hexadecimal views.
- System information: `neofetch`, `lscpu`, `lsblk`, `free`, `vmstat`, `journalctl`, `dmesg`, and simulated processes/services.
- Networking: `ping`, `ip`, `nslookup`, `curl`, `traceroute`, `netstat`, and `scan` print fictional results only.
- Development: `git init`, `status`, `add`, `commit`, `log`, branches, checkout, restore, and diff work against a per-session virtual repository.
- Packages: `apt update`, `search`, `show`, `install`, `remove`, `list`, and `dpkg -l` operate on an in-memory package catalogue.
- Calculations: `expr` and `bc` support basic arithmetic without evaluating JavaScript or shell code.

## Safety and limitations
- This is a simulated environment, not a real shell.
- No Windows, Linux, PowerShell, CMD, or host operating-system commands are executed.
- Networking commands display fictional results and do not connect to hosts or download anything.
- Git repositories, package installations, files, processes, services and permissions exist only in the simulated session.
- Each user has an isolated session per channel. Sessions and virtual files disappear when the bot stops or restarts.
- Every terminal response is wrapped in a triple-backtick Discord code block.
