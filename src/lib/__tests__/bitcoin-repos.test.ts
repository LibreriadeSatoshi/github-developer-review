import { describe, it, expect } from "vitest";
import { classifyRepo, classifyRepos } from "@/lib/bitcoin-repos";

describe("classifyRepo", () => {
  describe("Layer 1: Curated repos", () => {
    it("classifies bitcoin/bitcoin as core", () => {
      const result = classifyRepo("bitcoin/bitcoin");
      expect(result).not.toBeNull();
      expect(result!.tier).toBe("core");
      expect(result!.nameWithOwner).toBe("bitcoin/bitcoin");
    });

    it("classifies mempool/mempool as ecosystem", () => {
      const result = classifyRepo("mempool/mempool");
      expect(result).not.toBeNull();
      expect(result!.tier).toBe("ecosystem");
    });

    it("classifies ACINQ/eclair as ecosystem", () => {
      const result = classifyRepo("ACINQ/eclair");
      expect(result).not.toBeNull();
      expect(result!.tier).toBe("ecosystem");
    });
  });

  describe("Layer 2: Keyword matching", () => {
    it("classifies repo with 'bitcoin' in name as core", () => {
      const result = classifyRepo("someuser/bitcoin-wallet", {
        description: "A wallet",
        topics: [],
      });
      expect(result).not.toBeNull();
      expect(result!.tier).toBe("core");
    });

    it("classifies repo with 'cashu' in name as ecosystem", () => {
      const result = classifyRepo("someuser/cashu-mint", {
        description: "A mint",
        topics: [],
      });
      expect(result).not.toBeNull();
      expect(result!.tier).toBe("ecosystem");
    });

    it("classifies repo with 'nostr' as topic as adjacent", () => {
      const result = classifyRepo("someuser/my-app", {
        description: "An app",
        topics: ["nostr"],
      });
      expect(result).not.toBeNull();
      expect(result!.tier).toBe("adjacent");
    });

    it("matches keywords in description", () => {
      const result = classifyRepo("someuser/my-tool", {
        description: "A bitcoin tool for developers",
        topics: [],
      });
      expect(result).not.toBeNull();
      expect(result!.tier).toBe("core");
    });
  });

  describe("Layer 2: Word boundary matching", () => {
    it("does NOT match 'btc' in 'subtraction'", () => {
      const result = classifyRepo("someuser/subtraction-lib", {
        description: "subtraction library",
      });
      expect(result).toBeNull();
    });

    it("does NOT match 'dlc' in 'handlecard'", () => {
      const result = classifyRepo("someuser/handlecard");
      expect(result).toBeNull();
    });

    it("still matches 'btc' as standalone word", () => {
      const result = classifyRepo("someuser/my-btc-tool");
      expect(result).not.toBeNull();
      expect(result!.tier).toBe("core");
    });

    it("still matches 'bitcoin' in description", () => {
      const result = classifyRepo("someuser/tool", {
        description: "a bitcoin tool",
      });
      expect(result).not.toBeNull();
    });
  });

  describe("Curated repos: new entries", () => {
    it("classifies bitcoin-core/secp256k1 as core", () => {
      const result = classifyRepo("bitcoin-core/secp256k1");
      expect(result).not.toBeNull();
      expect(result!.tier).toBe("core");
      expect(result!.reason).toBe("curated");
    });
  });

  describe("Negative cases", () => {
    it("returns null for facebook/react", () => {
      const result = classifyRepo("facebook/react");
      expect(result).toBeNull();
    });

    it("returns null for ArkEcosystem/ark", () => {
      const result = classifyRepo("ArkEcosystem/ark", {
        description: "Ark blockchain",
        topics: ["blockchain"],
      });
      expect(result).toBeNull();
    });
  });

  describe("Edge cases", () => {
    it("handles case-insensitive keyword matching", () => {
      const result = classifyRepo("someuser/BITCOIN-CORE", {
        description: "",
        topics: [],
      });
      expect(result).not.toBeNull();
      expect(result!.tier).toBe("core");
    });

    it("curated takes precedence over keyword match", () => {
      const result = classifyRepo("bitcoin/bitcoin", {
        description: "nostr related",
        topics: ["nostr"],
      });
      expect(result).not.toBeNull();
      expect(result!.tier).toBe("core");
      expect(result!.reason).toContain("curated");
    });

    it("handles empty description and topics safely", () => {
      const result = classifyRepo("someuser/random-project", {
        description: "",
        topics: [],
      });
      expect(result).toBeNull();
    });

    it("handles missing metadata", () => {
      const result = classifyRepo("someuser/random-project");
      expect(result).toBeNull();
    });
  });
});

describe("classifyRepos", () => {
  it("returns a Map of classifications for multiple repos", () => {
    const repos = [
      { nameWithOwner: "bitcoin/bitcoin" },
      { nameWithOwner: "facebook/react" },
      { nameWithOwner: "mempool/mempool" },
    ];
    const result = classifyRepos(repos);
    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(2);
    expect(result.get("bitcoin/bitcoin")!.tier).toBe("core");
    expect(result.get("mempool/mempool")!.tier).toBe("ecosystem");
    expect(result.has("facebook/react")).toBe(false);
  });
});
