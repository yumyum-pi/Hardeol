package router

import (
	"net/http"
	"testing"
)

type mockResponseWriter struct{}

func (m *mockResponseWriter) Header() (h http.Header) {
	return http.Header{}
}

func (m *mockResponseWriter) Write(p []byte) (n int, err error) {
	return len(p), nil
}

func (m *mockResponseWriter) WriteString(s string) (n int, err error) {
	return len(s), nil
}

func (m *mockResponseWriter) WriteHeader(int) {}

type route struct {
	method int
	path   string
}

func BenchmarkStaticRoutes(b *testing.B) {
	Init()
	router := Get()
	w := new(mockResponseWriter)
	r, _ := http.NewRequest("GET", "/", nil)
	u := r.URL
	rq := u.RawQuery

	h := func(w http.ResponseWriter, r *http.Request, p []Param) {
	}

	for _, r := range staticRoutes {
		err := router.Handle(r.method, r.path, h)
		if err != nil {
			b.Fatalf("found while loading routes:%v", err)
		}
	}

	b.ReportAllocs()
	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		for _, route := range staticRoutes {
			r.Method = "GET"
			r.RequestURI = route.path
			u.Path = route.path
			u.RawQuery = rq
			router.ServeHTTP(w, r)
		}
	}
}

var staticRoutes = []route{
	{0, "/"},
	{0, "/cmd.html"},
	{0, "/code.html"},
	{0, "/contrib.html"},
	{0, "/contribute.html"},
	{0, "/debugging_with_gdb.html"},
	{0, "/docs.html"},
	{0, "/effective_go.html"},
	{0, "/files.log"},
	{0, "/gccgo_contribute.html"},
	{0, "/gccgo_install.html"},
	{0, "/go-logo-black.png"},
	{0, "/go-logo-blue.png"},
	{0, "/go-logo-white.png"},
	{0, "/go1.1.html"},
	{0, "/go1.2.html"},
	{0, "/go1.html"},
	{0, "/go1compat.html"},
	{0, "/go_faq.html"},
	{0, "/go_mem.html"},
	{0, "/go_spec.html"},
	{0, "/help.html"},
	{0, "/ie.css"},
	{0, "/install-source.html"},
	{0, "/install.html"},
	{0, "/logo-153x55.png"},
	{0, "/Makefile"},
	{0, "/root.html"},
	{0, "/share.png"},
	{0, "/sieve.gif"},
	{0, "/tos.html"},
	{0, "/articles"},
	{0, "/articles/go_command.html"},
	{0, "/articles/index.html"},
	{0, "/articles/wiki"},
	{0, "/articles/wiki/edit.html"},
	{0, "/articles/wiki/final-noclosure.go"},
	{0, "/articles/wiki/final-noerror.go"},
	{0, "/articles/wiki/final-parsetemplate.go"},
	{0, "/articles/wiki/final-template.go"},
	{0, "/articles/wiki/final.go"},
	{0, "/articles/wiki/get.go"},
	{0, "/articles/wiki/http-sample.go"},
	{0, "/articles/wiki/index.html"},
	{0, "/articles/wiki/Makefile"},
	{0, "/articles/wiki/notemplate.go"},
	{0, "/articles/wiki/part1-noerror.go"},
	{0, "/articles/wiki/part1.go"},
	{0, "/articles/wiki/part2.go"},
	{0, "/articles/wiki/part3-errorhandling.go"},
	{0, "/articles/wiki/part3.go"},
	{0, "/articles/wiki/test.bash"},
	{0, "/articles/wiki/test_edit.good"},
	{0, "/articles/wiki/test_Test.txt.good"},
	{0, "/articles/wiki/test_view.good"},
	{0, "/articles/wiki/view.html"},
	{0, "/codewalk"},
	{0, "/codewalk/codewalk.css"},
	{0, "/codewalk/codewalk.js"},
	{0, "/codewalk/codewalk.xml"},
	{0, "/codewalk/functions.xml"},
	{0, "/codewalk/markov.go"},
	{0, "/codewalk/markov.xml"},
	{0, "/codewalk/pig.go"},
	{0, "/codewalk/popout.png"},
	{0, "/codewalk/run"},
	{0, "/codewalk/sharemem.xml"},
	{0, "/codewalk/urlpoll.go"},
	{0, "/devel"},
	{0, "/devel/release.html"},
	{0, "/devel/weekly.html"},
	{0, "/gopher"},
	{0, "/gopher/appenginegopher.jpg"},
	{0, "/gopher/appenginegophercolor.jpg"},
	{0, "/gopher/appenginelogo.gif"},
	{0, "/gopher/bumper.png"},
	{0, "/gopher/bumper192x108.png"},
	{0, "/gopher/bumper320x180.png"},
	{0, "/gopher/bumper480x270.png"},
	{0, "/gopher/bumper640x360.png"},
	{0, "/gopher/doc.png"},
	{0, "/gopher/frontpage.png"},
	{0, "/gopher/gopherbw.png"},
	{0, "/gopher/gophercolor.png"},
	{0, "/gopher/gophercolor16x16.png"},
	{0, "/gopher/help.png"},
	{0, "/gopher/pkg.png"},
	{0, "/gopher/project.png"},
	{0, "/gopher/ref.png"},
	{0, "/gopher/run.png"},
	{0, "/gopher/talks.png"},
	{0, "/gopher/pencil"},
	{0, "/gopher/pencil/gopherhat.jpg"},
	{0, "/gopher/pencil/gopherhelmet.jpg"},
	{0, "/gopher/pencil/gophermega.jpg"},
	{0, "/gopher/pencil/gopherrunning.jpg"},
	{0, "/gopher/pencil/gopherswim.jpg"},
	{0, "/gopher/pencil/gopherswrench.jpg"},
	{0, "/play"},
	{0, "/play/fib.go"},
	{0, "/play/hello.go"},
	{0, "/play/life.go"},
	{0, "/play/peano.go"},
	{0, "/play/pi.go"},
	{0, "/play/sieve.go"},
	{0, "/play/solitaire.go"},
	{0, "/play/tree.go"},
	{0, "/progs"},
	{0, "/progs/cgo1.go"},
	{0, "/progs/cgo2.go"},
	{0, "/progs/cgo3.go"},
	{0, "/progs/cgo4.go"},
	{0, "/progs/defer.go"},
	{0, "/progs/defer.out"},
	{0, "/progs/defer2.go"},
	{0, "/progs/defer2.out"},
	{0, "/progs/eff_bytesize.go"},
	{0, "/progs/eff_bytesize.out"},
	{0, "/progs/eff_qr.go"},
	{0, "/progs/eff_sequence.go"},
	{0, "/progs/eff_sequence.out"},
	{0, "/progs/eff_unused1.go"},
	{0, "/progs/eff_unused2.go"},
	{0, "/progs/error.go"},
	{0, "/progs/error2.go"},
	{0, "/progs/error3.go"},
	{0, "/progs/error4.go"},
	{0, "/progs/go1.go"},
	{0, "/progs/gobs1.go"},
	{0, "/progs/gobs2.go"},
	{0, "/progs/image_draw.go"},
	{0, "/progs/image_package1.go"},
	{0, "/progs/image_package1.out"},
	{0, "/progs/image_package2.go"},
	{0, "/progs/image_package2.out"},
	{0, "/progs/image_package3.go"},
	{0, "/progs/image_package3.out"},
	{0, "/progs/image_package4.go"},
	{0, "/progs/image_package4.out"},
	{0, "/progs/image_package5.go"},
	{0, "/progs/image_package5.out"},
	{0, "/progs/image_package6.go"},
	{0, "/progs/image_package6.out"},
	{0, "/progs/interface.go"},
	{0, "/progs/interface2.go"},
	{0, "/progs/interface2.out"},
	{0, "/progs/json1.go"},
	{0, "/progs/json2.go"},
	{0, "/progs/json2.out"},
	{0, "/progs/json3.go"},
	{0, "/progs/json4.go"},
	{0, "/progs/json5.go"},
	{0, "/progs/run"},
	{0, "/progs/slices.go"},
	{0, "/progs/timeout1.go"},
	{0, "/progs/timeout2.go"},
	{0, "/progs/update.bash"},
}
