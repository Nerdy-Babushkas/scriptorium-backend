// tests/music.test.js

const request = require("supertest");
const express = require("express");
const musicRouter = require("../routes/music");

jest.mock("../services/music-service");
jest.mock("../services/user-service");
jest.mock("axios"); // Mock axios globally

const musicService = require("../services/music-service");
const { getUserFromToken } = require("../services/user-service");
const axios = require("axios");

const app = express();
app.use(express.json());
app.use("/api/music", musicRouter);

describe("Music Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ================= SEARCH =================
  test("GET /api/music/search returns tracks", async () => {
    // Mock axios response
    axios.get.mockResolvedValue({
      data: {
        recordings: [
          {
            id: "track123",
            title: "Test Track",
            "artist-credit": [
              { name: "Test Artist", artist: { id: "artist1" } },
            ],
            releases: [{ title: "Test Album", id: "release1", date: "2020" }],
            length: 200000,
          },
        ],
      },
    });

    const response = await request(app).get("/api/music/search?q=test");

    expect(response.statusCode).toBe(200);
    expect(response.body.tracks.length).toBe(1);
    expect(response.body.tracks[0].title).toBe("Test Track");
  });

  test("GET /api/music/search without query returns 400", async () => {
    const response = await request(app).get("/api/music/search");
    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe("Missing search query parameter 'q'");
  });

  // ================= SAVE TRACK =================
  test("POST /api/music saves track", async () => {
    musicService.saveTrack.mockResolvedValue({
      _id: "123",
      title: "Song",
    });

    const response = await request(app).post("/api/music").send({
      _id: "123",
      title: "Song",
    });

    expect(response.statusCode).toBe(200);
    expect(response.body.title).toBe("Song");
    expect(musicService.saveTrack).toHaveBeenCalled();
  });

  // ================= GET TRACK =================
  test("GET /api/music/:id returns track", async () => {
    musicService.getTrackById.mockResolvedValue({
      _id: "123",
      title: "Track",
    });

    const response = await request(app).get("/api/music/123");

    expect(response.statusCode).toBe(200);
    expect(response.body._id).toBe("123");
  });

  // ================= GET USER SHELF =================
  test("GET /api/music/shelf/:shelfName returns tracks", async () => {
    getUserFromToken.mockReturnValue({ _id: "user1" });
    musicService.getUserShelf.mockResolvedValue([{ title: "Track A" }]);

    const response = await request(app).get("/api/music/shelf/favorites");

    expect(response.statusCode).toBe(200);
    expect(response.body.length).toBe(1);
  });

  // ================= ADD TRACK TO SHELF =================
  test("POST /api/music/shelf/add adds track", async () => {
    getUserFromToken.mockReturnValue({ _id: "user1" });

    musicService.getTrackById.mockResolvedValue({
      _id: "track1",
      title: "Track",
    });

    musicService.addTrackToShelf.mockResolvedValue({
      message: "Track added",
    });

    const response = await request(app).post("/api/music/shelf/add").send({
      shelf: "favorites",
      _id: "track1",
      title: "Track",
    });

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Track added");
  });

  // ================= REMOVE TRACK =================
  test("POST /api/music/shelf/remove removes track", async () => {
    getUserFromToken.mockReturnValue({ _id: "user1" });

    musicService.removeTrackFromShelf.mockResolvedValue({
      message: "Removed",
    });

    const response = await request(app).post("/api/music/shelf/remove").send({
      shelf: "favorites",
      trackId: "track1",
    });

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Removed");
  });
});

// ================= ADVANCED SEARCH =================
describe("Advanced Music Search", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("GET /api/music/advanced/search returns tracks with query params", async () => {
    axios.get.mockResolvedValue({
      data: {
        count: 1,
        recordings: [
          {
            id: "adv123",
            title: "Advanced Track",
            "artist-credit": [
              { name: "Adv Artist", artist: { id: "artist1" } },
            ],
            releases: [{ title: "Adv Album", id: "release1", date: "2023" }],
            length: 180000,
          },
        ],
      },
    });

    const response = await request(app).get(
      "/api/music/advanced/search?title=Advanced&artist=Adv+Artist&page=1&limit=10",
    );

    expect(response.statusCode).toBe(200);
    expect(response.body.tracks.length).toBe(1);
    expect(response.body.tracks[0]._id).toBe("adv123");
    expect(response.body.tracks[0].title).toBe("Advanced Track");
    expect(response.body.page).toBe(1);
    expect(response.body.totalResults).toBe(1);
  });

  test("GET /api/music/advanced/search returns 400 if no query params", async () => {
    const response = await request(app).get("/api/music/advanced/search");

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe("Provide at least one search parameter");
  });

  test("GET /api/music/advanced/search returns 500 if API fails", async () => {
    axios.get.mockRejectedValue(new Error("API failure"));
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const response = await request(app).get(
      "/api/music/advanced/search?artist=Fail",
    );

    expect(response.statusCode).toBe(500);
    expect(response.body.message).toBe(
      "Error performing advanced MusicBrainz search",
    );

    consoleSpy.mockRestore();
  });
});
