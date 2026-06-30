import { useState, useEffect } from 'react';

export const usePasswordValidation = (password = '') => {
  const [isValid, setIsValid] = useState(false);
  const [errors, setErrors] = useState([]);
  const [strength, setStrength] = useState(0);

  useEffect(() => {
    const newErrors = [];
    let score = 0;

    // 1. Length Check
    if (password.length >= 8) {
      score += 1;
    } else {
      newErrors.push("Almeno 8 caratteri");
    }

    // 2. Uppercase Check
    if (/[A-Z]/.test(password)) {
      score += 1;
    } else {
      newErrors.push("Almeno una lettera maiuscola (A-Z)");
    }

    // 3. Lowercase Check
    if (/[a-z]/.test(password)) {
      score += 1;
    } else {
      newErrors.push("Almeno una lettera minuscola (a-z)");
    }

    // 4. Number Check
    if (/[0-9]/.test(password)) {
      score += 1;
    } else {
      newErrors.push("Almeno un numero (0-9)");
    }

    // 5. Special Char Check
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      score += 1;
    } else {
      newErrors.push("Almeno un carattere speciale (!@#$...)");
    }

    // Extra point for length > 12
    if (password.length > 12) score += 1;

    // Cap strength at 5
    const finalStrength = Math.min(score, 5);

    setErrors(newErrors);
    setStrength(finalStrength);
    setIsValid(newErrors.length === 0);

  }, [password]);

  // Helper text based on strength
  const getStrengthLabel = () => {
    if (password.length === 0) return '';
    if (strength < 2) return 'Molto Debole';
    if (strength < 3) return 'Debole';
    if (strength < 4) return 'Buona';
    if (strength < 5) return 'Forte';
    return 'Molto Forte';
  };

  const getStrengthColor = () => {
    if (password.length === 0) return 'bg-gray-200';
    if (strength < 2) return 'bg-red-500';
    if (strength < 3) return 'bg-orange-500';
    if (strength < 4) return 'bg-yellow-500';
    if (strength < 5) return 'bg-green-500';
    return 'bg-emerald-600';
  };

  return { isValid, errors, strength, getStrengthLabel, getStrengthColor };
};