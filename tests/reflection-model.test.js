// tests/reflection-model.test.js
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const Reflection = require("../models/Reflection");

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  await mongoose.connect(uri); // no need for useNewUrlParser / useUnifiedTopology
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  // Clean up all collections after each test
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe("Reflection Model", () => {
  test("saves a reflection with valid progress", async () => {
    const reflection = new Reflection({
      user: new mongoose.Types.ObjectId(),
      item: "book1",
      itemType: "book",
      text: "This is a reflection long enough to pass validation rules.",
      progress: { current: 5, total: 10, unit: "chapters" },
    });

    const saved = await reflection.save();

    expect(saved.progress.current).toBe(5);
    expect(saved.progress.total).toBe(10);
  });

  test("throws error if progress.current > progress.total", async () => {
    const reflection = new Reflection({
      user: new mongoose.Types.ObjectId(),
      item: "book2",
      itemType: "book",
      text: "Another long reflection to test progress validation.",
      progress: { current: 15, total: 10, unit: "pages" },
    });

    await expect(reflection.save()).rejects.toThrow(
      "Progress current cannot exceed total.",
    );
  });

  test("allows optional fields to be empty", async () => {
    const reflection = new Reflection({
      user: new mongoose.Types.ObjectId(),
      item: "track1",
      itemType: "track",
      text: "Valid text long enough for testing optional fields.",
    });

    const saved = await reflection.save();

    expect(saved.moodTags).toEqual([]);
    expect(saved.feelings).toEqual([]);
    expect(saved.metadata).toEqual({});
  });
});
