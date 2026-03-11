// tests/music.test.js

const request = require("supertest");
const express = require("express");

const musicRouter = require("../routes/music");

jest.mock("../services/music-service");
jest.mock("../services/user-service");

const musicService = require("../services/music-service");
const { getUserFromToken } = require("../services/user-service");

const app = express();
app.use(express.json());
app.use("/api/music", musicRouter);

describe("Music Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ================= SEARCH =================
  test("GET /api/music/search returns tracks", async () => {
    const response = await request(app).get("/api/music/search?q=test");

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("tracks");
  });

  test("GET /api/music/search without query returns 400", async () => {
    const response = await request(app).get("/api/music/search");

    expect(response.statusCode).toBe(400);
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
