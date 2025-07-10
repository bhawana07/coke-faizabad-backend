var mongoose = require('mongoose');
var commentSchema = mongoose.Schema({
    stop_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Stop'
    },
    machine_name: {
        type: String
    },
	created_date:{
		type:Date
	},
	comment_date:{
		type:Date
	},
    selected_causes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FaultCause'
    }],
    parts: [{
        type: String
    }],
    user_comment: [
        {
            user_name: {
                type: String
            },
            timestamp: {
                type: Date,
                default: Date.now
            },
            comment: {
                type: String
            }
        }
    ]
});

var Comment = mongoose.model('Comment',commentSchema);
var getFaultComment = async function(id){
	var comment = await Comment.findOne({ stop_id: id });
	return comment
}

module.exports.Comment = Comment;
module.exports.getFaultComment = getFaultComment;

