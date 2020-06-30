import { last } from "lodash";

export interface LexemeDefinition {
  type: string;
  pattern: RegExp;
  formatter?: (value: string) => any;
}

export class Lexeme {
  type: string;
  value: number | string | boolean | null;
  pos: number;
  line: number;
  column: number;
}

const whitespacesRegExp = /^[\s\n\r]+/;
const lineCommentRegExp = /^\/\//;
const beginBlockCommentRegExp = /^\/\*/;
const unknownRegExp = /^[^\s\n\r]+/;

export class Tokenizer {
  private _line = 0;
  private _column = 0;
  private _cursor = 0;
  private _source: string;

  constructor(
    private _content: string,
    private _definitions: LexemeDefinition[]
  ) {
    this._source = _content;
  }

  next(): Lexeme {
    let lexeme = null;
    while (this._content.length) {
      if (lineCommentRegExp.test(this._content)) {
        this.skipLineComment();
      } else if (beginBlockCommentRegExp.test(this._content)) {
        this.skipBlockComments();
      } else if (whitespacesRegExp.test(this._content)) {
        this.skipWhitespaces();
      } else if ((lexeme = this.nextToken())) {
        return lexeme;
      }
    }
    return null;
  }

  private skipWhitespaces() {
    const matches = this._content.match(whitespacesRegExp);
    if (matches) {
      this._content = this._content.substr(matches[0].length);
      this.advaceCursor(matches[0]);
    }
  }

  private skipLineComment() {
    let matches = null;
    do {
      matches = this._content.match(/^\/\/.*/g);
      if (matches) {
        this._content = this._content.substr(matches[0].length);
        this.advaceCursor(matches[0]);
      }
    } while (matches);
  }

  private skipBlockComments() {
    const matches = this._content.match(/\/\*.*?\*\//gs);
    if (matches) {
      this._content = this._content.substr(matches[0].length);
      this.advaceCursor(matches[0]);
    }
  }

  private advaceCursor(eaten: string) {
    this._cursor += eaten.length;
    const str = this._source.substring(0, this._cursor);
    const lines = str.split(/\n/);
    this._line = lines.length - 1;
    this._column = last(lines).length;
  }

  private nextToken(): Lexeme {
    let matches;
    let lexeme = null;

    for (const definition of this._definitions) {
      if ((matches = this._content.match(definition.pattern))) {
        lexeme = new Lexeme();
        lexeme.type = definition.type;

        lexeme.value = definition.formatter
          ? definition.formatter(matches)
          : matches[0];
        break;
      }
    }

    if (!lexeme) {
      matches = this._content.match(unknownRegExp);
      lexeme = new Lexeme();
      lexeme.type = "Unknown";
      lexeme.value = matches[0];
    }

    lexeme.pos = this._cursor;
    lexeme.line = this._line;
    lexeme.column = this._column;

    this._content = this._content.substr(matches[0].length);
    this.advaceCursor(matches[0]);

    return lexeme;
  }
}
