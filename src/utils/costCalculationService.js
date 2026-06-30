// Utilities for cost calculation across different database providers
// Pricing as of May 2026 standard tiers

export const calculateSupabaseCost = (storageGB, monthlyApiCalls, bandwidthGB) => {
    // Pro Plan base $25
    let cost = 25;
    
    // Storage: $0.125 per GB over 8GB
    if (storageGB > 8) {
        cost += (storageGB - 8) * 0.125;
    }
    
    // Bandwidth: $0.09 per GB over 250GB
    if (bandwidthGB > 250) {
        cost += (bandwidthGB - 250) * 0.09;
    }

    return parseFloat(cost.toFixed(2));
};

export const calculateFirebaseCost = (storageGB, monthlyReads, monthlyWrites) => {
    // Blaze Plan (Pay as you go)
    let cost = 0;
    
    // Storage: $0.18 per GB
    cost += storageGB * 0.18;
    
    // Reads: $0.06 per 100K
    cost += (monthlyReads / 100000) * 0.06;
    
    // Writes: $0.18 per 100K
    cost += (monthlyWrites / 100000) * 0.18;

    return parseFloat(cost.toFixed(2));
};

export const calculateMongoDBCost = (storageGB, monthlyOperations) => {
    // Atlas Serverless
    let cost = 0;
    
    // Storage: $0.25 per GB/month
    cost += storageGB * 0.25;
    
    // Reads: $0.10 per million
    cost += (monthlyOperations * 0.8 / 1000000) * 0.10;
    
    // Writes: $1.00 per million
    cost += (monthlyOperations * 0.2 / 1000000) * 1.00;

    // Minimum typical cost roughly $9/mo for dedicated
    return Math.max(parseFloat(cost.toFixed(2)), 9.00);
};

export const calculatePlanetScaleCost = (monthlyReads, monthlyWrites) => {
    // Scaler Pro base $29
    let cost = 29;
    
    // Reads: $1 per 1B over 100B (usually negligible for small apps)
    if (monthlyReads > 100000000000) {
        cost += ((monthlyReads - 100000000000) / 1000000000) * 1;
    }
    
    // Writes: $1 per 50M over 50M
    if (monthlyWrites > 50000000) {
        cost += ((monthlyWrites - 50000000) / 50000000) * 1;
    }

    return parseFloat(cost.toFixed(2));
};

export const calculateTursoCost = (monthlyRequests) => {
    // Scaler plan $29
    let cost = 29;
    
    // Overages: $0.80 per 1M rows read/written over limit
    if (monthlyRequests > 1000000000) {
        cost += ((monthlyRequests - 1000000000) / 1000000) * 0.80;
    }

    return parseFloat(cost.toFixed(2));
};

export const calculateRailwayCost = (computeHours, storageGB) => {
    // Hobby $5/mo or Pro $20/mo + usage
    // Estimating standard DB footprint
    let cost = 5; // Base usage
    
    // vCPU & RAM roughly $10/mo for a basic PG instance
    cost += 10;
    
    // Storage: $0.20 per GB
    cost += storageGB * 0.20;

    return parseFloat(cost.toFixed(2));
};

export const calculateRenderCost = (computeHours, storageGB) => {
    // Starter PG is $20/mo
    let cost = 20;
    
    // Storage overages usually higher tier needed
    if (storageGB > 50) {
        cost += 50; // Next tier
    }

    return parseFloat(cost.toFixed(2));
};