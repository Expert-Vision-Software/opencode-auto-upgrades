export class BundledAssetsMissingError extends Error {
  constructor(missingPath: string, packageDir: string) {
    super(
      `Bundled asset missing or empty: ${missingPath}. The opencode-auto-upgrades package at ${packageDir} is partial. ` +
        `Clear that directory and reinstall with: bunx opencode-auto-upgrades install --scope global`
    );
    this.name = "BundledAssetsMissingError";
  }
}
