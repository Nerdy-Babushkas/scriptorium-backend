// tests/recommendations-service.test.js
const {
  getRecommendations,
  __setClientForTest,
} = require("../services/recommendations-service");

describe("Recommendations Service (unit tests, API-free)", () => {
  afterEach(() => {
    // Reset client after each test
    __setClientForTest(undefined);
  });

  const mockValidResponse = {
    choices: [
      {
        message: {
          content: JSON.stringify({
            recommendations: [
              {
                title: "Inception",
                year: 2010,
                director: "Christopher Nolan",
                reason: "Mind-bending thriller",
                tags: ["sci-fi", "thriller"],
              },
            ],
          }),
        },
      },
    ],
  };

  it("returns parsed recommendations correctly", async () => {
    const mockClient = {
      chat: {
        completions: { create: jest.fn().mockResolvedValue(mockValidResponse) },
      },
    };
    __setClientForTest(mockClient);

    const result = await getRecommendations("anything");
    expect(result).toEqual(
      JSON.parse(mockValidResponse.choices[0].message.content).recommendations,
    );
  });

  it("returns empty array when content is missing", async () => {
    const mockClient = {
      chat: {
        completions: { create: jest.fn().mockResolvedValue({ choices: [{}] }) },
      },
    };
    __setClientForTest(mockClient);

    const result = await getRecommendations("anything");
    expect(result).toEqual([]);
  });

  it("returns empty array when JSON is invalid", async () => {
    const mockClient = {
      chat: {
        completions: {
          create: jest
            .fn()
            .mockResolvedValue({
              choices: [{ message: { content: "bad json" } }],
            }),
        },
      },
    };
    __setClientForTest(mockClient);

    const result = await getRecommendations("anything");
    expect(result).toEqual([]);
  });

  it("returns empty array when client.create rejects (API error)", async () => {
    const mockClient = {
      chat: {
        completions: { create: jest.fn().mockRejectedValue(new Error("fail")) },
      },
    };
    __setClientForTest(mockClient);

    const result = await getRecommendations("anything");
    expect(result).toEqual([]);
  });
});
