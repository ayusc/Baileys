# Live message-edit smoke

Run the manual message-edit smoke from an interactive terminal:

```bash
yarn smoke:live:edit
```

The command creates a linked-device session in an operating-system temporary directory and displays its QR code.
The pairing is retained by default for eight hours after the last run, so repeated runs during one development
session normally reconnect without another QR scan. After the connection opens, follow the two prompts:

1. From your own WhatsApp number, type and send the exact synthetic message shown in the terminal, either in a
   direct chat with the paired account or in a group containing both accounts.
2. Edit that same message to different synthetic text and save it.

The command reports the original and edited text, then exits successfully only if the encrypted edit path requested
the original message and emitted a readable `messages.update` event for the same message ID.

This command is manual, requires a TTY, and refuses to run in CI. It stores the original message only in memory.
Authentication state is isolated per checkout outside the repository. Its directory is restricted to the current
operating-system user, contained files are restricted to that user, symlinks are rejected, and concurrent runs are
blocked. After eight idle hours the next run deletes the local state and requests a new pairing. The old linked-device
entry may remain visible on the phone after local expiry and can be removed there.

Use dedicated test accounts and synthetic text. Do not capture or share the QR code, authentication directory, phone
numbers, message secrets, or protocol payloads. Filesystem permissions do not protect against malware or other
processes already running as the same operating-system user, or against an administrator.
