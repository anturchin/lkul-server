const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DocumentSchema = new Schema({
    documentId: {
        type: Schema.Types.ObjectId,
        required: true
    },
    signedDocumentName: {
        type: String,
        required: true
    }
});

module.exports = mongoose.model('signeddocument', DocumentSchema);