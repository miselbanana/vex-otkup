'use client'

import { useEffect } from 'react'
import * as CookieConsent from 'vanilla-cookieconsent'
import 'vanilla-cookieconsent/dist/cookieconsent.css'

// Banner za pristanak na kolačiće (vanilla-cookieconsent).
// Postavljen je samo u javnom layoutu, pa ga admin i /prijava nemaju.
// Izbor se pamti u kolačiću cc_cookie (6 mjeseci). Meta Pixel se na kategoriju
// "marketing" spaja u koraku 1.14. Dotad banner samo pamti izbor.
// Izgled (boje, fontovi, visina gumba) prilagođen je u globals.css (#cc-main).
export function PristanakKolacica() {
  useEffect(() => {
    // Poziva se jednom. Paket sam pazi da se banner ne pokrene dvaput.
    CookieConsent.run({
      categories: {
        necessary: { enabled: true, readOnly: true },
        marketing: {
          // Kad kupac povuče pristanak, Metini kolačići se brišu.
          autoClear: { cookies: [{ name: /^_fbp$/ }, { name: /^_fbc$/ }] },
        },
      },
      guiOptions: {
        consentModal: {
          layout: 'box',
          position: 'bottom center',
          // "Prihvati sve" i "Odbij" moraju biti jednako vidljivi.
          equalWeightButtons: true,
          flipButtons: false,
        },
        preferencesModal: {
          layout: 'box',
          equalWeightButtons: true,
          flipButtons: false,
        },
      },
      language: {
        default: 'hr',
        translations: {
          hr: {
            consentModal: {
              title: 'Kolačići',
              description:
                'Nužne kolačiće koristimo kako bi stranica radila. Uz vaš pristanak koristimo i marketinške kolačiće (Meta), kako bismo znali koji vas je oglas doveo do nas. Svoj izbor možete promijeniti u bilo kojem trenutku gumbom „Postavke kolačića“ u podnožju stranice.',
              acceptAllBtn: 'Prihvati sve',
              acceptNecessaryBtn: 'Odbij',
              showPreferencesBtn: 'Postavke',
              footer: '<a href="/politika-privatnosti">Politika privatnosti</a>',
            },
            preferencesModal: {
              title: 'Postavke kolačića',
              acceptAllBtn: 'Prihvati sve',
              acceptNecessaryBtn: 'Odbij sve',
              savePreferencesBtn: 'Spremi izbor',
              closeIconLabel: 'Zatvori',
              sections: [
                {
                  description:
                    'Ovdje birate koje kolačiće smijemo koristiti. Više o tome pročitajte u <a href="/politika-privatnosti">politici privatnosti</a>.',
                },
                {
                  title: 'Nužni',
                  description:
                    'Potrebni su za rad stranice i narudžbe, npr. za pamćenje ovog izbora i zaštitu od robota. Nije ih moguće isključiti.',
                  linkedCategory: 'necessary',
                },
                {
                  title: 'Marketing',
                  description:
                    'Meta Pixel (Facebook i Instagram). Pomaže nam saznati koji vas je oglas doveo do nas te prikazivati oglase ljudima kojima bi mogli biti korisni.',
                  linkedCategory: 'marketing',
                },
              ],
            },
          },
        },
      },
    })
  }, [])

  return null
}
