const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['book', 'music', 'movies'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  current: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'completed'],
    default: 'active'
  },
  media: {
    type: Object,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('Goal', goalSchema);