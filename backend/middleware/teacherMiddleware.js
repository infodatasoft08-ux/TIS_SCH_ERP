const Joi = require('joi');

const createTeacher = Joi.object({
  employee_code: Joi.string().required(),
  role_id: Joi.number().required(),
  qualification: Joi.string().allow('', null),
  bio: Joi.string().allow('', null)
});


module.exports = {
    createTeacher
};