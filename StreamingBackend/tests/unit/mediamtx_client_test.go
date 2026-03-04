package unit

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/vigileye/streaming-backend/internal/infrastructure/streaming"
)

// ─── MediaMTX Client Tests ───

func TestMediaMTXClient_AddPath_Success(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "POST", r.Method)
		assert.Contains(t, r.URL.Path, "/v3/config/paths/add/cam-1")
		assert.Equal(t, "application/json", r.Header.Get("Content-Type"))

		var body map[string]interface{}
		err := json.NewDecoder(r.Body).Decode(&body)
		require.NoError(t, err)
		assert.Equal(t, "rtsp://192.168.1.100:554/stream", body["source"])

		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	client := streaming.NewMediaMTXClient(server.URL)
	err := client.AddPath("cam-1", "rtsp://192.168.1.100:554/stream")
	assert.NoError(t, err)
}

func TestMediaMTXClient_AddPath_Conflict_UpdatesFallback(t *testing.T) {
	callCount := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		callCount++
		if callCount == 1 {
			// First call: AddPath returns Conflict
			assert.Contains(t, r.URL.Path, "/v3/config/paths/add/")
			w.WriteHeader(http.StatusConflict)
		} else {
			// Second call: UpdatePath succeeds
			assert.Equal(t, "PATCH", r.Method)
			assert.Contains(t, r.URL.Path, "/v3/config/paths/patch/")
			w.WriteHeader(http.StatusOK)
		}
	}))
	defer server.Close()

	client := streaming.NewMediaMTXClient(server.URL)
	err := client.AddPath("cam-1", "rtsp://192.168.1.100:554/stream")
	assert.NoError(t, err)
	assert.Equal(t, 2, callCount) // Confirm it called both add and patch
}

func TestMediaMTXClient_RemovePath_Success(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "DELETE", r.Method)
		assert.Contains(t, r.URL.Path, "/v3/config/paths/delete/cam-1")
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	client := streaming.NewMediaMTXClient(server.URL)
	err := client.RemovePath("cam-1")
	assert.NoError(t, err)
}

func TestMediaMTXClient_RemovePath_NotFound_IsIdempotent(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer server.Close()

	client := streaming.NewMediaMTXClient(server.URL)
	err := client.RemovePath("cam-nonexistent")
	assert.NoError(t, err) // Should not error on 404
}

func TestMediaMTXClient_GetPathStatus(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "GET", r.Method)
		assert.Contains(t, r.URL.Path, "/v3/paths/get/cam-1")
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(streaming.MediaMTXPathStatus{
			Name:  "cam-1",
			Ready: true,
			Readers: []streaming.MediaMTXReader{
				{Type: "webrtc", ID: "viewer-1"},
				{Type: "webrtc", ID: "viewer-2"},
			},
		})
	}))
	defer server.Close()

	client := streaming.NewMediaMTXClient(server.URL)
	status, err := client.GetPathStatus("cam-1")
	require.NoError(t, err)
	require.NotNil(t, status)
	assert.Equal(t, "cam-1", status.Name)
	assert.True(t, status.Ready)
	assert.Len(t, status.Readers, 2)
}

func TestMediaMTXClient_GetPathStatus_NotFound(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer server.Close()

	client := streaming.NewMediaMTXClient(server.URL)
	status, err := client.GetPathStatus("cam-nonexistent")
	assert.NoError(t, err)
	assert.Nil(t, status)
}

func TestMediaMTXClient_ListPaths(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "GET", r.Method)
		assert.Contains(t, r.URL.Path, "/v3/paths/list")
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(streaming.MediaMTXPathList{
			ItemCount: 2,
			PageCount: 1,
			Items: []streaming.MediaMTXPathStatus{
				{Name: "cam-1", Ready: true},
				{Name: "cam-2", Ready: false},
			},
		})
	}))
	defer server.Close()

	client := streaming.NewMediaMTXClient(server.URL)
	list, err := client.ListPaths()
	require.NoError(t, err)
	require.NotNil(t, list)
	assert.Equal(t, 2, list.ItemCount)
	assert.Len(t, list.Items, 2)
	assert.Equal(t, "cam-1", list.Items[0].Name)
}

func TestMediaMTXClient_IsHealthy(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(streaming.MediaMTXPathList{ItemCount: 0, Items: []streaming.MediaMTXPathStatus{}})
	}))
	defer server.Close()

	client := streaming.NewMediaMTXClient(server.URL)
	assert.True(t, client.IsHealthy())
}

func TestMediaMTXClient_IsHealthy_Unreachable(t *testing.T) {
	client := streaming.NewMediaMTXClient("http://127.0.0.1:1") // unreachable port
	assert.False(t, client.IsHealthy())
}

func TestMediaMTXClient_WHEPOffer_Success(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "POST", r.Method)
		assert.Contains(t, r.URL.Path, "/cam-1/whep")
		assert.Equal(t, "application/sdp", r.Header.Get("Content-Type"))

		w.Header().Set("Location", "/cam-1/whep/session-abc")
		w.WriteHeader(http.StatusCreated)
		w.Write([]byte("v=0\r\no=- 0 0 IN IP4 0.0.0.0\r\n..."))
	}))
	defer server.Close()

	client := streaming.NewMediaMTXClient(server.URL)
	answer, sessionURL, err := client.WHEPOffer("cam-1", "v=0\r\no=- 0 0 IN IP4 0.0.0.0\r\n...")
	require.NoError(t, err)
	assert.Contains(t, answer, "v=0")
	assert.Equal(t, server.URL+"/cam-1/whep/session-abc", sessionURL)
}

func TestMediaMTXClient_WHEPDelete_Success(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "DELETE", r.Method)
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	client := streaming.NewMediaMTXClient(server.URL)
	err := client.WHEPDelete(server.URL + "/cam-1/whep/session-abc")
	assert.NoError(t, err)
}

func TestMediaMTXClient_UpdatePath_Success(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "PATCH", r.Method)
		assert.Contains(t, r.URL.Path, "/v3/config/paths/patch/cam-1")
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	client := streaming.NewMediaMTXClient(server.URL)
	err := client.UpdatePath("cam-1", "rtsp://192.168.1.200:554/stream-new")
	assert.NoError(t, err)
}

func TestMediaMTXClient_AddPath_ServerError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("internal error"))
	}))
	defer server.Close()

	client := streaming.NewMediaMTXClient(server.URL)
	err := client.AddPath("cam-1", "rtsp://bad-url")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "500")
}
