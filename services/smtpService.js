const net = require('node:net');
const { SMTP_TIMEOUT } = require('../config/constants');

function smtpProbe(mxHost, email, options = {}) {
  const timeout = options.timeout || SMTP_TIMEOUT;
  const fromAddress = options.fromAddress || 'postmaster@verifier.local';

  return new Promise((resolve) => {
    let socket;
    let buffer = '';
    let stage = 'greeting';
    let finished = false;

    const finish = (payload) => {
      if (finished) return;
      finished = true;

      try {
        socket?.destroy();
      } catch (_) {}

      resolve(payload);
    };

    const send = (command) => {
      try {
        socket.write(`${command}\r\n`);
      } catch (err) {
        finish({
          result: 'unknown',
          resultcode: 3,
          subresult: 'connection_error',
          error: err.message,
        });
      }
    };

    const handleLine = (line) => {
      const match = line.match(/^(\d{3})([- ])(.*)$/);
      if (!match) return;

      const code = Number(match[1]);
      const separator = match[2];

      if (separator !== ' ') return;

      if (stage === 'greeting') {
        if (code === 220) {
          stage = 'ehlo';
          send('EHLO verifier.local');
          return;
        }

        return finish({
          result: 'unknown',
          resultcode: 3,
          subresult: 'connection_error',
          error: line,
        });
      }

      if (stage === 'ehlo') {
        if (code === 250) {
          stage = 'mailfrom';
          send(`MAIL FROM:<${fromAddress}>`);
          return;
        }

        if ([450, 451, 452, 421].includes(code)) {
          return finish({
            result: 'unknown',
            resultcode: 3,
            subresult: code === 450 ? 'greylisted' : 'smtp_temporary_error',
            error: line,
          });
        }

        return finish({
          result: 'unknown',
          resultcode: 3,
          subresult: 'smtp_unexpected_response',
          error: line,
        });
      }

      if (stage === 'mailfrom') {
        if (code === 250 || code === 251) {
          stage = 'rcpt';
          send(`RCPT TO:<${email}>`);
          return;
        }

        if ([550, 551, 552, 553].includes(code)) {
          return finish({
            result: 'invalid',
            resultcode: 6,
            subresult: 'mailbox_does_not_exist',
            error: line,
          });
        }

        if (code === 450) {
          return finish({
            result: 'unknown',
            resultcode: 3,
            subresult: 'greylisted',
            error: line,
          });
        }

        if ([421, 451, 452].includes(code)) {
          return finish({
            result: 'unknown',
            resultcode: 3,
            subresult: 'smtp_temporary_error',
            error: line,
          });
        }

        return finish({
          result: 'unknown',
          resultcode: 3,
          subresult: 'smtp_unexpected_response',
          error: line,
        });
      }

      if (stage === 'rcpt') {
        if (code === 250 || code === 251) {
          return finish({
            result: 'valid',
            resultcode: 1,
            subresult: 'mailbox_exists',
            error: null,
          });
        }

        if ([550, 551, 552, 553].includes(code)) {
          return finish({
            result: 'invalid',
            resultcode: 6,
            subresult: 'mailbox_does_not_exist',
            error: line,
          });
        }

        if (code === 450) {
          return finish({
            result: 'unknown',
            resultcode: 3,
            subresult: 'greylisted',
            error: line,
          });
        }

        if ([421, 451, 452].includes(code)) {
          return finish({
            result: 'unknown',
            resultcode: 3,
            subresult: 'smtp_temporary_error',
            error: line,
          });
        }

        return finish({
          result: 'unknown',
          resultcode: 3,
          subresult: 'smtp_unexpected_response',
          error: line,
        });
      }
    };

    try {
      socket = net.connect(25, mxHost);
      socket.setEncoding('utf8');
      socket.setTimeout(timeout);

      socket.on('data', (chunk) => {
        buffer += chunk;
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line) handleLine(line);
        }
      });

      socket.on('timeout', () => {
        finish({
          result: 'unknown',
          resultcode: 3,
          subresult: 'connection_timeout',
          error: 'Connection timed out',
        });
      });

      socket.on('error', (err) => {
        finish({
          result: 'unknown',
          resultcode: 3,
          subresult: 'connection_error',
          error: err.message,
        });
      });

      socket.on('close', () => {
        if (!finished) {
          finish({
            result: 'unknown',
            resultcode: 3,
            subresult: 'connection_closed',
            error: 'Connection closed before completion',
          });
        }
      });
    } catch (err) {
      finish({
        result: 'unknown',
        resultcode: 3,
        subresult: 'connection_error',
        error: err.message,
      });
    }
  });
}

module.exports = smtpProbe;