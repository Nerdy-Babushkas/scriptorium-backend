const Reflection = require("../models/Reflection");
const reflectionService = require("../services/reflection-service");

// Mock dependencies used inside the service
jest.mock("../models/Reflection");
jest.mock("../services/badge-service", () => ({
  onReflectionCreated: jest.fn().mockResolvedValue([]),
}));
jest.mock("../services/streak-service", () => ({
  recordActivity: jest.fn().mockResolvedValue({ newBadges: [] }),
}));

describe("Reflection Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ================= CREATE REFLECTION =================
  describe("createReflection", () => {
    test("creates a new reflection", async () => {
      Reflection.countDocuments.mockResolvedValue(1);

      const savedReflection = {
        _id: "r1",
        user: "u1",
        item: "i1",
        text: "My reflection",
      };

      const mockSave = jest.fn().mockResolvedValue(savedReflection);

      Reflection.mockImplementation(() => ({
        save: mockSave,
      }));

      const result = await reflectionService.createReflection({
        user: "u1",
        item: "i1",
        text: "My reflection",
      });

      expect(mockSave).toHaveBeenCalled();
      expect(result._id).toBe("r1");
      expect(result).toMatchObject(savedReflection);
    });
  });

  // ================= GET USER REFLECTIONS =================
  describe("getUserReflections", () => {
    test("returns sorted reflections for a user", async () => {
      const reflections = [{ _id: "r1" }, { _id: "r2" }];
      const sortMock = jest.fn().mockResolvedValue(reflections);

      Reflection.find.mockReturnValue({ sort: sortMock });

      const result = await reflectionService.getUserReflections("u1");

      expect(Reflection.find).toHaveBeenCalledWith({ user: "u1" });
      expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toBe(reflections);
    });
  });

  // ================= GET REFLECTIONS FOR ITEM =================
  describe("getReflectionsByItem", () => {
    test("returns sorted reflections for an item", async () => {
      const reflections = [{ _id: "r3" }];
      const sortMock = jest.fn().mockResolvedValue(reflections);

      Reflection.find.mockReturnValue({ sort: sortMock });

      const result = await reflectionService.getReflectionsByItem(
        "i1",
        "typeA",
      );

      expect(Reflection.find).toHaveBeenCalledWith({
        item: "i1",
        itemType: "typeA",
      });
      expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toBe(reflections);
    });
  });

  // ================= GET SPECIFIC REFLECTION =================
  describe("getReflectionById", () => {
    test("throws if reflection not found", async () => {
      Reflection.findById.mockResolvedValue(null);

      await expect(reflectionService.getReflectionById("r1")).rejects.toThrow(
        "Reflection not found",
      );
    });

    test("returns the reflection if found", async () => {
      const reflection = { _id: "r1" };
      Reflection.findById.mockResolvedValue(reflection);

      const result = await reflectionService.getReflectionById("r1");

      expect(result).toBe(reflection);
    });
  });

  // ================= UPDATE REFLECTION =================
  describe("updateReflection", () => {
    test("throws if reflection not found", async () => {
      Reflection.findById.mockResolvedValue(null);

      await expect(
        reflectionService.updateReflection("r1", { text: "New" }),
      ).rejects.toThrow("Reflection not found");
    });

    test("updates and saves the reflection", async () => {
      const updated = { _id: "r1", text: "New" };
      const mockSave = jest.fn().mockResolvedValue(updated);

      const reflection = {
        _id: "r1",
        text: "Old",
        save: mockSave,
      };

      Reflection.findById.mockResolvedValue(reflection);

      const result = await reflectionService.updateReflection("r1", {
        text: "New",
      });

      expect(reflection.text).toBe("New");
      expect(mockSave).toHaveBeenCalled();
      expect(result).toBe(updated);
    });
  });

  // ================= REMOVE REFLECTION =================
  describe("removeReflection", () => {
    test("throws if reflection not found", async () => {
      Reflection.findByIdAndDelete.mockResolvedValue(null);

      await expect(reflectionService.removeReflection("r1")).rejects.toThrow(
        "Reflection not found",
      );
    });

    test("removes reflection successfully", async () => {
      Reflection.findByIdAndDelete.mockResolvedValue({ _id: "r1" });

      const result = await reflectionService.removeReflection("r1");

      expect(result).toEqual({ message: "Reflection removed" });
    });
  });
});
