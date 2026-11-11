export class PayloadModeUnsupportedError extends Error {
  constructor(packageName: string) {
    super(
      `${packageName} ships Markdown assets only (skills, commands, agents) and cannot be installed in plugin mode. ` +
        `Copy install is the only deployment: run without --mode, or with --mode copy.`
    );
    this.name = "PayloadModeUnsupportedError";
  }
}
