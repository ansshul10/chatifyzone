const Filter = require('bad-words');
const filter = new Filter();

module.exports = (req, res, next) => {
  if (req.body.content) {
    if (filter.isProfane(req.body.content)) {
      return res.status(400).json({ msg: 'Message contains inappropriate language' });
    }
    req.body.content = filter.clean(req.body.content);
  }
  next();
};