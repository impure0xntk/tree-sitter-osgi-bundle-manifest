{
  description = "tree-sitter parser for OSGi Bundle Manifest (R8)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    tree-sitter-java-manifest = {
      url = "github:impure0xntk/tree-sitter-java-manifest";
      flake = false;
    };
  };

  outputs = { self, nixpkgs, flake-utils, tree-sitter-java-manifest }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          nativeBuildInputs = with pkgs; [
            pkg-config
          ];
          buildInputs = with pkgs; [
            nodejs_22
            tree-sitter
          ];

          shellHook = ''
            echo "tree-sitter-osgi-bundle-manifest dev shell"
            echo "  node:         $(node --version)"
            echo "  tree-sitter:  $(tree-sitter --version)"
            echo "  base grammar: tree-sitter-java-manifest"
          '';
        };
      });
}
