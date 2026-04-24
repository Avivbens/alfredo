import type { AlfredListItem } from 'fast-alfred';
import { FastAlfred } from 'fast-alfred';
import type { Country } from 'world-countries';
import { registerUpdater } from '@alfredo/updater';
import { Variables } from '../common/variables.enum';
import { searchCountries } from '../services/search.service';

(async () => {
  const alfredClient = new FastAlfred();
  alfredClient.updates(registerUpdater('country-info'));

  const sliceAmount = alfredClient.env.getEnv(Variables.SLICE_AMOUNT, {
    defaultValue: 15,
    parser: Number,
  });
  const fuzzyThreshold = alfredClient.env.getEnv(Variables.FUZZY_THRESHOLD, {
    defaultValue: 0.4,
    parser: (input) => Number(input) / 10,
  });

  const { input } = alfredClient;

  try {
    const matches = await searchCountries(input ?? '', sliceAmount, fuzzyThreshold);

    const items: AlfredListItem[] = matches.map((country: Country) => {
      const {
        cca2,
        cca3,
        flag,
        name: { common: commonName, official: officialName },
        capital,
        region,
        subregion,
        currencies,
        languages,
        idd,
        area,
      } = country;

      const callingCode = idd?.suffixes?.length === 1 ? `${idd.root}${idd.suffixes[0]}` : idd?.root || '';

      const currencyList = Object.entries(currencies ?? {})
        .map(([code, { symbol }]) => (symbol ? `${code} (${symbol})` : code))
        .join(', ');

      const languageList = Object.values(languages ?? {}).join(', ');

      const capitalCity = capital?.[0] ?? 'N/A';
      const regionText = subregion ? `${region} / ${subregion}` : region;
      const areaText = `${area.toLocaleString('en-US')} km²`;

      const title = `${flag} ${cca2} · ${cca3} — ${commonName}`;

      const subtitleParts = [
        officialName,
        callingCode && `Tel: ${callingCode}`,
        `Capital: ${capitalCity}`,
        regionText,
        currencyList,
        languageList,
        areaText,
      ].filter(Boolean);

      const subtitle = subtitleParts.join(' · ');

      return {
        title,
        subtitle,
        arg: JSON.stringify(country, null, 2),
        uid: cca3,
      };
    });

    alfredClient.output({ items });
  } catch (error) {
    alfredClient.error(error);
  }
})();
