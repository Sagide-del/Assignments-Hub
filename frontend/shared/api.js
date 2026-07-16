// shared/api.js — Unified API client for the frontend dashboards

(function() {
  'use strict';

  const API_BASE = window.API_BASE_URL || 'http://localhost:3000/api/v1';

  // Helper to get the current token
  function getToken() {
    return localStorage.getItem('token') || null;
  }

  // Helper to set the token
  function setToken(token) {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  // Stores a full {accessToken, refreshToken, expiresIn, user} login/refresh
  // response. Prefers shared/auth-client.js's AuthClient.storeSession (which
  // also persists the refresh token + schedules the silent-refresh timer —
  // required now that access tokens only last ~15 minutes) and falls back to
  // just the access token if that script isn't loaded on this page.
  function storeSession(data) {
    if (window.AuthClient && typeof window.AuthClient.storeSession === 'function') {
      window.AuthClient.storeSession(data);
    } else {
      setToken(data.accessToken);
    }
  }

  // Helper to get user from localStorage
  function getUser() {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  }

  // Helper to set user
  function setUser(user) {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
      if (user.name) localStorage.setItem('userName', user.name);
      if (user.role) localStorage.setItem('userRole', user.role);
    } else {
      localStorage.removeItem('user');
    }
  }

  // Helper to check if authenticated
  function isAuthenticated() {
    return !!getToken();
  }

  // Helper to logout — revokes the refresh token server-side (via
  // shared/auth-client.js, if that script is loaded on this page) before
  // wiping local storage, so a stolen refresh token can't outlive an
  // explicit logout.
  async function logout() {
    if (window.AuthClient && typeof window.AuthClient.logout === 'function') {
      await window.AuthClient.logout();
    }
    localStorage.clear();
    window.location.href = '../unified-dashboard/index.html';
  }

  // API request helper
  async function request(method, endpoint, data, requiresAuth = true) {
    const url = API_BASE + endpoint;
    const headers = {
      'Content-Type': 'application/json',
    };

    if (requiresAuth) {
      const token = getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }
      headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
      method,
      headers,
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    const responseData = await response.json();

    if (!response.ok) {
      // NestJS validation errors (400s from the global ValidationPipe) come
      // back as message: string[] rather than a single string — join them
      // so callers always get a readable Error instead of "[object Object]"
      // or an unreadable Array.toString() dump.
      const rawMessage = responseData.message || responseData.error || 'Request failed';
      const message = Array.isArray(rawMessage) ? rawMessage.join('; ') : rawMessage;
      throw new Error(message);
    }

    return responseData;
  }

  // API Client
  window.AH = {
    Auth: {
      // Staff login
      loginStaff: async function(schoolCode, email, password) {
        const data = await request('POST', '/auth/staff/login', {
          schoolCode,
          email,
          password,
        }, false);
        
        // Store token and user
        if (data.accessToken) {
          storeSession(data);
          if (data.user) {
            setUser(data.user);
          }
          return data;
        }
        throw new Error('No access token received');
      },

      // Student login
      loginStudent: async function(schoolCode, admissionNumber) {
        const data = await request('POST', '/auth/student/login', {
          schoolCode,
          admissionNumber,
        }, false);

        // Store token and user
        if (data.accessToken) {
          storeSession(data);
          // The backend already returns the real user record (real id,
          // name, grade, role) as `data.user` — use it directly instead of
          // fabricating a placeholder. A fabricated user with no `id` broke
          // anything keyed on the student's id (report card, STEM Labs
          // CSL/pathway progress) and, worse, `getUser()` returning a user
          // with no name/grade could look fine while still being wrong data.
          if (data.user) {
            setUser(data.user);
          }
          return data;
        }
        throw new Error('No access token received');
      },

      // Get current user
      getUser: function() {
        return getUser();
      },

      // Set token manually (for unified login)
      setToken: function(token) {
        setToken(token);
      },

      // Set user manually (for unified login)
      setUser: function(user) {
        setUser(user);
      },

      // Check if authenticated
      isAuthenticated: function() {
        return isAuthenticated();
      },

      // Logout — async because it revokes the refresh token server-side
      // first; callers that need to wait for it to finish (rare — the
      // function itself redirects when done) can `await AH.Auth.logout()`.
      logout: function() {
        return logout();
      }
    },

    // Assignments API
    Assignments: {
      list: async function() {
        const data = await request('GET', '/assignments');
        return data.data || data;
      },

      create: async function(assignment) {
        const data = await request('POST', '/assignments', assignment);
        return data.data || data;
      },

      submit: async function(assignmentId) {
        const data = await request('POST', `/assignments/${assignmentId}/submissions`, {});
        return data.data || data;
      }
    },

    // Submissions API
    Submissions: {
      list: async function() {
        const data = await request('GET', '/submissions');
        return data.data || data;
      },

      grade: async function(submissionId, score) {
        const data = await request('PATCH', `/submissions/${submissionId}/grade`, { score });
        return data.data || data;
      }
    },

    // Users API
    Users: {
      list: async function() {
        const data = await request('GET', '/users');
        return data.data || data;
      }
    },

    // Lab Sessions API (STEM Labs completion records)
    LabSessions: {
      list: async function() {
        const data = await request('GET', '/lab-sessions');
        return data.data || data;
      },

      // `answers` is optional — [{ questionId, answer }] from a lab's
      // post-video quiz (see Labs.get). Omit it for labs with no quiz
      // (existing "Mark complete" / generic simulator flow keeps working
      // unchanged). The backend auto-grades and returns score/maxScore.
      complete: async function(labKey, competency, answers) {
        const body = { labKey, competency };
        if (answers && answers.length) body.answers = answers;
        const data = await request('POST', '/lab-sessions', body);
        return data.data || data;
      }
    },

    // Labs API (the STEM Labs catalog itself — what's available to complete,
    // managed by the platform admin under Superadmin > Labs & Practicals)
    Labs: {
      list: async function() {
        const data = await request('GET', '/labs');
        return data.data || data;
      },

      // Full lab detail including quiz questions (correctAnswer stripped
      // for students server-side) — used to load the video+quiz player.
      get: async function(id) {
        const data = await request('GET', `/labs/${id}`);
        return data.data || data;
      }
    },

    // Reports API
    Reports: {
      studentReportCard: async function(studentId) {
        const data = await request('GET', `/reports/student/${studentId}`);
        return data.data || data;
      }
    },

    // CSL Activities API (the grade-scoped catalog of required/optional
    // Community Service Learning activities, managed by the platform admin
    // under Superadmin > CSL Activities)
    CslActivities: {
      list: async function(grade) {
        const qs = grade ? `?grade=${encodeURIComponent(grade)}` : '';
        const data = await request('GET', `/csl-activities${qs}`);
        return data.data || data;
      }
    },

    // CSL Submissions API — a student's evidence + reflection for an
    // activity, and a tutor's (teacher/school admin/platform admin) review.
    CslSubmissions: {
      list: async function() {
        const data = await request('GET', '/csl-submissions');
        return data.data || data;
      },

      // Also used to resubmit after NEEDS_REVISION — same call, the backend
      // updates the existing row instead of creating a duplicate.
      submit: async function(cslActivityId, evidenceUrl, reflection) {
        const data = await request('POST', '/csl-submissions', { cslActivityId, evidenceUrl, reflection });
        return data.data || data;
      },

      // payload: { status: 'APPROVED' | 'NEEDS_REVISION', score, maxScore, feedback }
      review: async function(id, payload) {
        const data = await request('PATCH', `/csl-submissions/${id}/review`, payload);
        return data.data || data;
      }
    },

    // File uploads (evidence photos, attachments) — multipart, so this
    // bypasses the JSON-only `request()` helper above.
    Uploads: {
      single: async function(file) {
        const token = getToken();
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch(`${API_BASE}/uploads/single`, {
          method: 'POST',
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
          body: formData,
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || 'Upload failed');
        return data;
      }
    }
  };

  console.log('AH API client loaded');
})();