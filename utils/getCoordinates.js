const axios = require("axios");
const expressError = require("./expressError");

async function getCoordinates(location) {
    const res = await axios.get("https://nominatim.openstreetmap.org/search", {
        params: {
            q: location,
            format: "json"
        },
        headers: {
            "User-Agent": "wanderlust"
        }
    });
    if(res.data !== 0) {
        const {lat, lon} = res.data[0];
        return {lat, lon};
    } else {
        throw new expressError(404, "Location Not Found!");
    }
}

module.exports = getCoordinates;