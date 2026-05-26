function buildResponse({
    email,
    result,
    resultcode,
    subresult,
    domain,
    mxRecords = [],
    error = null,
    didyoumean = null,
    startedAt,
}) {
    const executiontime = Number(((Date.now() - startedAt) / 1000).toFixed(3));

    const response = {
        email,
        result,
        resultcode,
        subresult,
        domain,
        mxRecords,
        executiontime,
        error: error || null,
        timestamp: new Date().toISOString(),
    };

    if (didyoumean) {
        response.didyoumean = didyoumean;
    }

    return response;
}

module.exports = buildResponse;