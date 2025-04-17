const ImageNamesConvert = (string) => {
    if (!string) return '';

    const sanitized = string
        .toLowerCase()
        .replace(/[^a-z0-9 .]/g, '')
        .replace(/ /g, '-');

    return sanitized;
};

module.exports = { ImageNamesConvert };
