const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const User = require("../models/User");
const { getTotalMediaCount } = require("../services/media-count-service");

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe("Media Count Service", () => {
  test("returns 0 if user does not exist", async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const count = await getTotalMediaCount(fakeId);

    expect(count).toBe(0);
  });

  test("counts unique items across all media types", async () => {
    const user = await User.create({
      email: "test@example.com",

      bookshelves: [
        { name: "favorites", books: ["b1", "b2"] },
        { name: "reading", books: ["b2", "b3"] }, // b2 duplicated
      ],

      movieshelves: [
        { name: "watchlist", movies: ["m1", "m2"] },
        { name: "watched", movies: ["m2", "m3"] }, // m2 duplicated
      ],

      musicShelves: [
        { name: "liked", tracks: ["t1", "t2"] },
        { name: "chill", tracks: ["t2", "t3"] }, // t2 duplicated
      ],
    });

    const count = await getTotalMediaCount(user._id);

    // unique: b1, b2, b3 = 3
    //         m1, m2, m3 = 3
    //         t1, t2, t3 = 3
    expect(count).toBe(9);
  });

  test("handles empty shelves gracefully", async () => {
    const user = await User.create({
      email: "empty@example.com",
      bookshelves: [],
      movieshelves: [],
      musicShelves: [],
    });

    const count = await getTotalMediaCount(user._id);

    expect(count).toBe(0);
  });

  test("ignores null/undefined values", async () => {
    const user = await User.create({
      email: "weird@example.com",

      bookshelves: [{ name: "test", books: ["b1", null, undefined, "b2"] }],

      movieshelves: [{ name: "test", movies: [null, "m1"] }],

      musicShelves: [{ name: "test", tracks: [undefined, "t1"] }],
    });

    const count = await getTotalMediaCount(user._id);

    // b1, b2 = 2
    // m1 = 1
    // t1 = 1
    expect(count).toBe(4);
  });

  test("does not double-count same ID across shelves", async () => {
    const user = await User.create({
      email: "dup@example.com",

      bookshelves: [
        { name: "a", books: ["b1"] },
        { name: "b", books: ["b1"] }, // duplicate
      ],
    });

    const count = await getTotalMediaCount(user._id);

    expect(count).toBe(1);
  });
});
