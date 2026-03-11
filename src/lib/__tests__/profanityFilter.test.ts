import { checkProfanity } from '../profanityFilter';

describe('checkProfanity', () => {
  it('allows clean descriptions', () => {
    expect(checkProfanity('The sun sets beautifully today')).toEqual({ clean: true });
    expect(checkProfanity('El sol brilla muy fuerte')).toEqual({ clean: true });
  });

  it('blocks English profanity', () => {
    const result = checkProfanity('What the fuck is this');
    expect(result.clean).toBe(false);
    expect(result.flaggedWord).toBe('fuck');
  });

  it('blocks Spanish profanity', () => {
    const result = checkProfanity('Esto es una puta mierda');
    expect(result.clean).toBe(false);
    expect(result.flaggedWord).toBe('puta');
  });

  it('blocks slurs', () => {
    const result = checkProfanity('Some terrible slur nigger here');
    expect(result.clean).toBe(false);
    expect(result.flaggedWord).toBe('nigger');
  });

  it('catches l33t speak evasions', () => {
    const result = checkProfanity('This is sh1t man');
    expect(result.clean).toBe(false);
  });

  it('catches accent-stripped Spanish evasions', () => {
    const result = checkProfanity('Es un maricon total');
    expect(result.clean).toBe(false);
  });

  it('does not flag mild words', () => {
    expect(checkProfanity('What the hell is happening')).toEqual({ clean: true });
    expect(checkProfanity('Damn that was close today')).toEqual({ clean: true });
  });

  it('handles Unicode confusables', () => {
    // Fullwidth characters
    const result = checkProfanity('\uFF46\uFF55\uFF43\uFF4B this thing');
    expect(result.clean).toBe(false);
  });
});
