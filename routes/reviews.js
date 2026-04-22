const express = require('express');
const router = express.Router();

router.get('/:placeId', (req, res) => {
  res.json({
    rating: 4.8,
    reviews: [
      { author: 'Demo User', text: 'Great service!', rating: 5 }
    ]
  });
});

module.exports = router;
