const vaildation = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error } = schema.validate(req[property], { abortEarly: false });
    if (error) {
      return res.status(400).json({
        error: error.details.map(d => d.message)
      });
    }
    next();
  };
};

module.exports = {
    vaildation,
};