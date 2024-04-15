import { useIntl } from 'react-intl';
import { UL, Classes, H2 } from '@blueprintjs/core';

function injectPumpoutLink(str: string) {
  const pieces = str.split('PUMPOUT');
  if (pieces.length < 2) {
    return str;
  }
  return (
    <>
      {pieces[0]}
      <a href="https://github.com/AnyhowStep/pump-out-sqlite3-dump">Pump Out</a>
      {pieces[1]}
    </>
  );
}

export function About() {
  const { formatMessage: t } = useIntl();

  return (
    <div className={Classes.DIALOG_BODY}>
      <H2>Credits</H2>
      <UL>
        {t({ id: 'about' })
          .split(' * ')
          .map((line, i) => (
            <li key={i}>{injectPumpoutLink(line)}</li>
          ))}
      </UL>
    </div>
  );
}
