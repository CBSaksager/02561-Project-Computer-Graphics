{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs?ref=nixos-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.x86_64-linux;
      python = pkgs.python311;

    in
    {
      devShells.${system}.default = pkgs.mkShell {
        buildInputs = [
          (python.withPackages (ps: with ps; [
            pandas
            matplotlib
            numpy
          ]))
        ];

        shellHook = ''
          echo "python environment ready"
        '';
      };
    };
}
