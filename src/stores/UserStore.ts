import { makeAutoObservable } from 'mobx';

/**
 * UserStore
 *
 * 마이크로프론트엔드 아키텍처에서 사용자 정보를 중앙 관리합니다.
 * 각 페이지의 mount/unmount 라이프사이클에서 사용자 정보를 등록/제거합니다.
 */
class UserStore {
  // 현재 로그인한 사용자 ID
  user: string | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  /**
   * 사용자 정보 등록
   * 페이지 mount 시 호출되어 사용자 정보를 store에 등록합니다.
   *
   * @param user - 사용자 ID
   */
  setUser(user: string): void {
    this.user = user;
    console.log('[UserStore] User registered:', user);
  }

  /**
   * 사용자 정보 제거
   * 페이지 unmount 시 호출되어 사용자 정보를 store에서 제거합니다.
   */
  clearUser(): void {
    console.log('[UserStore] User cleared:', this.user);
    this.user = null;
  }

  /**
   * 사용자 로그인 여부 확인
   */
  get isLoggedIn(): boolean {
    return this.user !== null;
  }

  /**
   * 현재 사용자 ID 반환
   */
  get currentUser(): string | null {
    return this.user;
  }
}

export const userStore = new UserStore();
