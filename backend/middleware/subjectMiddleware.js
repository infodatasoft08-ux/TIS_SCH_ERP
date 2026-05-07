const Joi = require('joi');

const createSubject = Joi.object({
  code: Joi.string().required(),
  name: Joi.string().required(),
  description: Joi.string().allow('', null)
});

module.exports = {
    createSubject
};