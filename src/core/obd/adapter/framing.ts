const MAX_BUFFER = 8192;

/**
 * An ELM327 ends every reply with the ">" prompt, and links such as BLE deliver text in small
 * chunks. This collects chunks and returns each complete reply (the text before a prompt).
 */
export class ResponseFramer {
  private buffer = '';

  push(chunk: string): string[] {
    this.buffer += chunk;
    const replies: string[] = [];
    for (;;) {
      const end = this.buffer.indexOf('>');
      if (end === -1) break;
      replies.push(this.buffer.slice(0, end));
      this.buffer = this.buffer.slice(end + 1);
    }
    // Garbage with no prompt must not grow forever.
    if (this.buffer.length > MAX_BUFFER) this.buffer = '';
    return replies;
  }

  reset(): void {
    this.buffer = '';
  }
}
