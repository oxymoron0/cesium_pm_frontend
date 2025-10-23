import { makeAutoObservable } from 'mobx';

/**
 * 부모 애플리케이션에서 전달되는 사용자 정보 타입
 */
export interface User {
  account: string;
  areaId: string;
  areaName: string;
  cityId: string;
  cityName: string;
  createTime: string;
  createUser: string;
  departmentId: string;
  departmentName: string;
  organizationId: string;
  organizationName: string;
  provinceid: string;
  roleId: string | null;
  sysType: string | null;
  userState: number;
  userid: string;
}

/**
 * UserStore
 *
 * 마이크로프론트엔드 아키텍처에서 사용자 정보를 중앙 관리합니다.
 * 각 페이지의 mount/unmount 라이프사이클에서 사용자 정보를 등록/제거합니다.
 */
class UserStore {
  // 현재 로그인한 사용자 ID (기본값: 독립 실행 모드용)
  user: string = 'leorca';

  constructor() {
    makeAutoObservable(this);
  }

  /**
   * 사용자 정보 등록
   * 페이지 mount 시 호출되어 사용자 정보를 store에 등록합니다.
   *
   * @param user - 사용자 객체 또는 사용자 ID 문자열
   */
  setUser(user: User | string): void {
    // User 객체인 경우 userid 추출, 문자열인 경우 그대로 사용
    this.user = typeof user === 'string' ? user : user.userid;
    console.log('[UserStore] User registered:', this.user);
  }

  /**
   * 사용자 정보 초기화
   * 페이지 unmount 시 호출되어 사용자 정보를 기본값으로 초기화합니다.
   */
  clearUser(): void {
    console.log('[UserStore] User cleared:', this.user);
    this.user = 'leorca';
  }

  /**
   * 사용자 로그인 여부 확인
   */
  get isLoggedIn(): boolean {
    return this.user !== 'leorca';
  }

  /**
   * 현재 사용자 ID 반환
   */
  get currentUser(): string {
    return this.user;
  }
}

export const userStore = new UserStore();
