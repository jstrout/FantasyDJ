import { Injectable } from '@angular/core';
import { AngularFireDatabase, FirebaseListObservable } from 'angularfire2';
import { Observable } from 'rxjs/Observable';

import { League } from '../models/fantasydj-models';

@Injectable()
export class LeagueData {

  private fbLeagues: FirebaseListObservable<any[]>;

  constructor(private db: AngularFireDatabase) {
    this.fbLeagues = this.db.list('/Leagues');
  }

  loadLeague(leagueId: string): Promise<League> {
    return new Promise<League>((resolve, reject) => {
      this.db.object('/Leagues/' + leagueId)
        .map(this.mapFBLeague)
        .subscribe(league => {
          if (! league) {
            reject('league does not exist');
          }
          resolve(league);
        });
    });
  }

  loadLeagues(userId: string): Observable<League[]> {
    return this.db.list(this.fbUserLeaguesUrl(userId))
      .map(items => {
        let leagues: League[] = [];
        for (let item of items) {
          this.loadLeague(item.$key)
            .then(league => leagues.push(league))
            .catch(error => {
              console.log(error);
            });
        }
        return leagues;
      });
  }

  createLeague(name: string,
               creatorId: string,
               opponentId: string): Promise<League> {
    return new Promise<League>((resolve, reject) => {
      let usersRef = {};
      usersRef[creatorId] = true;
      usersRef[opponentId] = false;

      let leagueId: string = this.fbLeagues.push({
        name: name,
        users: usersRef
      }).key;

      if (leagueId) {
        console.log(leagueId);
        this.loadLeague(leagueId).then(league => {
            this.db.object(this.fbUserLeaguesUrl(creatorId, leagueId))
              .set(true)
              .then(_ => {
                this.db.object(this.fbUserLeaguesUrl(opponentId, leagueId))
                  .set(false)
                  .then(_ => resolve(league))
                  .catch(error => reject(error));
              })
              .catch(error => reject(error));
          }).catch(error => reject(error));
      }
      else {
        reject('no leagueId generated');
      }
    });
  }

  private fbUserLeaguesUrl(userId: string, leagueId?: string): string {
    let url = '/UserProfiles/' + userId + '/leagues';
    if (leagueId) {
      url += '/' + leagueId;
    }
    return url;
  }

  private mapFBLeague(fbleague): League {
    console.log('start mapFBLeague');
    if ('$value' in fbleague && ! fbleague.$value) {
      console.log(fbleague, 'returning null');
      return null;
    }

    let league = <League>{
      id: fbleague.$key,
      name: fbleague.name,
      users: [],
      draftDate: fbleague.draftDate,
      endTime: fbleague.endTime,
      winner: fbleague.winner || null
    };
    for (var key in fbleague.users) {
      league.users.push(key);
    }

    return league;
  }

  addSongToUser(userId: string, 
                        leagueId: string,
                        songId: string, 
                        songName: string, 
                        songArtist: string ): Promise<League> {
    return new Promise<League>((resolve, reject) => {

    let song: string = this.db.list('/Songs').push({
        spotifyId: songId,
        name: songName,
        artist: songArtist
      }).key;

    if (song) {
        console.log(song);
        this.db.object('/Leagues/'+leagueId+'/users/'+userId+'/'+song).set(true);
        //this.loadLeague(leagueId).then(league => {
            
          //}).catch(error => reject(error));
      }
      else {
        reject('no song generated');
      }

});
}
}