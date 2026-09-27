const mongoose = require('mongoose')
const { AUTHOR_NAME_MIN_LENGTH } = require('../constants')

const schema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    minlength: AUTHOR_NAME_MIN_LENGTH,
  },
  born: {
    type: Number,
  },
  books: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Book' }],
})

module.exports = mongoose.model('Author', schema)
