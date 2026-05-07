const Joi = require('joi');

const createGrade = Joi.object({
  name: Joi.string().min(1).required(),
  description: Joi.string().allow('', null)
});


module.exports = {
    createGrade,
};