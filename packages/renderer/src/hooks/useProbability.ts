import { useState, useEffect } from 'react';

export const useProbability = (probability: number): boolean => {
	if (probability < 0 || probability > 100) {
		throw new Error('Probability must be between 0 and 100 (inclusive)');
	}

	const [result, setResult] = useState<boolean>(false);

	useEffect(() => setResult(Math.random() * 100 < probability), [probability]);

	return result;
};
